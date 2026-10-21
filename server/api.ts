import { z } from "zod";
import type { ServerConfig } from "./config";
import type { IRProvider } from "./provider";
import { failure, runPipeline, type GenerationResult } from "./pipeline";
export type LogMetadata = { attempts: number; latencyMs: number; kind: string };
function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function createAPI(
  config: ServerConfig,
  provider: IRProvider | undefined,
  log: (metadata: LogMetadata) => void = () => {},
  now = Date.now,
) {
  let requests = 0,
    windowStart = now(),
    busy = false;
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const allowedHosts = [
      `127.0.0.1:${config.port}`,
      `localhost:${config.port}`,
    ];
    const origin = request.headers.get("origin");
    if (
      !allowedHosts.includes(request.headers.get("host") ?? url.host) ||
      (origin &&
        ![
          `http://127.0.0.1:5173`,
          `http://localhost:5173`,
          ...allowedHosts.map((host) => `http://${host}`),
        ].includes(origin))
    )
      return json(
        failure("bad_request", "origin", "This origin is not allowed."),
        403,
      );
    if (url.pathname === "/api/capabilities" && request.method === "GET")
      return json({
        aiEnabled: Boolean(config.apiKey && config.model && provider),
      });
    if (url.pathname !== "/api/generate" || request.method !== "POST")
      return json(
        failure("bad_request", "route", "Unknown API route or method."),
        404,
      );
    const started = now();
    function reject(result: GenerationResult & { ok: false }, status: number) {
      log({ attempts: 0, latencyMs: now() - started, kind: result.kind });
      return json(result, status);
    }
    if (now() - windowStart >= config.rateWindowMs) {
      requests = 0;
      windowStart = now();
    }
    if (++requests > config.rateLimit || busy)
      return reject(
        failure(
          "rate_limited",
          "rate_limit",
          "Local generation limit reached. Wait before trying again.",
        ),
        429,
      );
    if (
      !request.headers.get("content-type")?.match(/^application\/json(?:;|$)/i)
    )
      return reject(
        failure(
          "bad_request",
          "content_type",
          "Send an application/json request.",
        ),
        400,
      );
    const maxBody = config.maxPromptLength * 4 + 1024;
    if (Number(request.headers.get("content-length")) > maxBody)
      return reject(
        failure(
          "bad_request",
          "body_size",
          "Request body exceeds the byte limit.",
        ),
        413,
      );
    let candidate: unknown;
    try {
      const reader = request.body?.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > maxBody) {
              await reader.cancel();
              return reject(
                failure(
                  "bad_request",
                  "body_size",
                  "Request body exceeds the byte limit.",
                ),
                413,
              );
            }
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      candidate = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return reject(
        failure("bad_request", "invalid_json", "Request body must be JSON."),
        400,
      );
    }
    const parsed = z
      .object({ prompt: z.string().trim().min(1).max(config.maxPromptLength) })
      .strict()
      .safeParse(candidate);
    if (!parsed.success)
      return reject(
        failure(
          "bad_request",
          "prompt",
          `Provide only a non-empty prompt up to ${config.maxPromptLength} characters.`,
          "prompt",
        ),
        400,
      );
    if (!provider || !config.apiKey || !config.model)
      return reject(
        failure(
          "provider_error",
          "ai_disabled",
          "AI is disabled. Configure the server or use deterministic samples.",
        ),
        503,
      );
    busy = true;
    try {
      const { result, meta } = await runPipeline(
        provider,
        parsed.data.prompt,
        config,
        request.signal,
        now,
      );
      log({
        attempts: meta.attempts,
        latencyMs: meta.latencyMs,
        kind: result.ok ? "success" : result.kind,
      });
      return json(
        result,
        result.ok ? 200 : result.kind === "timeout" ? 504 : 502,
      );
    } finally {
      busy = false;
    }
  };
}
