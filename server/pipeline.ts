import {
  validateDesign,
  type Design,
  type ValidationError,
  formatErrors,
} from "../src/ir/schema";
import type { Limits } from "./config";
import { type IRProvider, type Usage, ProviderFailure } from "./provider";
import { buildSystemPrompt, userMessage } from "./prompt";
export type FailureKind =
  | "bad_request"
  | "rate_limited"
  | "provider_error"
  | "timeout"
  | "invalid_output";
export type GenerationMeta = {
  attempts: number;
  repaired: boolean;
  model: string;
  latencyMs: number;
  firstAttemptValid: boolean;
  settings: {
    maxOutputTokens: number;
    temperature: number | null;
    repairAttempts: number;
  };
  usage?: Usage;
};
export type GenerationResult =
  | { ok: true; design: Design; meta: GenerationMeta }
  | { ok: false; kind: FailureKind; errors: ValidationError[] };
export type PipelineReport = { result: GenerationResult; meta: GenerationMeta };
export function failure(
  kind: FailureKind,
  code: string,
  message: string,
  path = "$",
): GenerationResult & { ok: false } {
  return { ok: false, kind, errors: [{ path, code, message }] };
}
export function parseOutput(
  text: string,
  maxBytes: number,
): { ok: true; candidate: unknown } | { ok: false; errors: ValidationError[] } {
  if (Buffer.byteLength(text, "utf8") > maxBytes)
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "output_size",
          message: "Model output exceeds the byte limit.",
        },
      ],
    };
  let source = text.trim();
  const fence = /^```(?:json)?\s*\n([\s\S]*?)\n```$/i.exec(source);
  if (fence) source = fence[1];
  try {
    return { ok: true, candidate: JSON.parse(source) };
  } catch {
    return {
      ok: false,
      errors: [
        {
          path: "$",
          code: "invalid_json",
          message: "Model output must contain one JSON object only.",
        },
      ],
    };
  }
}
export async function runPipeline(
  provider: IRProvider,
  prompt: string,
  limits: Limits,
  signal?: AbortSignal,
  now: () => number = Date.now,
): Promise<PipelineReport> {
  const started = now();
  const repairAttempts = Math.min(2, Math.max(0, limits.repairAttempts));
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, limits.timeoutMs);
  const meta: GenerationMeta = {
    attempts: 0,
    repaired: false,
    model: limits.model,
    latencyMs: 0,
    firstAttemptValid: false,
    settings: {
      maxOutputTokens: limits.maxOutputTokens,
      temperature: limits.temperature ?? null,
      repairAttempts,
    },
  };
  function finish(result: GenerationResult): PipelineReport {
    meta.latencyMs = Math.max(0, now() - started);
    return { result, meta };
  }
  try {
    if (!prompt.trim() || prompt.length > limits.maxPromptLength)
      return finish(
        failure(
          "bad_request",
          "prompt",
          `Provide a non-empty prompt up to ${limits.maxPromptLength} characters.`,
          "prompt",
        ),
      );
    let user = userMessage(prompt);
    const system = buildSystemPrompt();
    for (let attempt = 0; attempt <= repairAttempts; attempt++) {
      if (controller.signal.aborted)
        return finish(
          failure(
            timedOut ? "timeout" : "provider_error",
            timedOut ? "timeout" : "cancelled",
            timedOut
              ? "Generation timed out. Try a smaller request."
              : "Generation was cancelled.",
          ),
        );
      meta.attempts++;
      // Race the provider against abort even if a mock or transport ignores AbortSignal.
      const output = await new Promise<
        Awaited<ReturnType<IRProvider["generateIR"]>>
      >((resolve, reject) => {
        const onAbort = () => reject(new Error("aborted"));
        controller.signal.addEventListener("abort", onAbort, { once: true });
        Promise.resolve()
          .then(() =>
            provider.generateIR({
              model: limits.model,
              system,
              user,
              maxOutputTokens: limits.maxOutputTokens,
              temperature: limits.temperature,
              signal: controller.signal,
            }),
          )
          .then(resolve, reject)
          .finally(() =>
            controller.signal.removeEventListener("abort", onAbort),
          );
      });
      if (output.usage)
        meta.usage = {
          inputTokens:
            (meta.usage?.inputTokens ?? 0) + output.usage.inputTokens,
          outputTokens:
            (meta.usage?.outputTokens ?? 0) + output.usage.outputTokens,
        };
      const parsed = parseOutput(output.text, limits.maxOutputBytes);
      const validation = parsed.ok ? validateDesign(parsed.candidate) : parsed;
      if (validation.ok) {
        meta.firstAttemptValid = attempt === 0;
        meta.repaired = attempt > 0;
        meta.latencyMs = Math.max(0, now() - started);
        return finish({ ok: true, design: validation.design, meta });
      }
      const reportedErrors = validation.errors.slice(0, 50).map((error) => ({
        path: error.path.slice(0, 256),
        code: error.code.slice(0, 100),
        message: error.message.slice(0, 512),
      }));
      if (attempt === repairAttempts)
        return finish({
          ok: false,
          kind: "invalid_output",
          errors: reportedErrors,
        });
      // JSON encoding keeps hostile delimiters in data; truncate by UTF-8 bytes before encoding.
      const invalid = Buffer.from(output.text)
        .subarray(0, limits.repairBytes)
        .toString("utf8");
      const errors = formatErrors(reportedErrors).slice(0, 8000);
      user = `${userMessage(prompt)}\nRepair this invalid IR using the contract. Return only a complete corrected JSON object.\n<untrusted_repair>\n${JSON.stringify({ errors, invalid })}\n</untrusted_repair>`;
    }
    return finish(
      failure(
        "invalid_output",
        "invalid_output",
        "No valid design was produced.",
      ),
    );
  } catch (error) {
    if (
      !timedOut &&
      !controller.signal.aborted &&
      error instanceof ProviderFailure
    )
      return finish(failure(error.kind, error.code, error.message));
    return finish(
      failure(
        timedOut ? "timeout" : "provider_error",
        timedOut
          ? "timeout"
          : controller.signal.aborted
            ? "cancelled"
            : "provider_error",
        timedOut
          ? "Generation timed out. Try a smaller request."
          : "The provider request could not be completed. Check server configuration and try again.",
      ),
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
