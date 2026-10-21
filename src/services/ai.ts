import { z } from "zod";
import {
  validateDesign,
  type Design,
  type ValidationError,
} from "../ir/schema";
const errorSchema = z
  .object({
    path: z.string().max(1000),
    code: z.string().max(100),
    message: z.string().max(4000),
  })
  .strict();
const failureSchema = z
  .object({
    ok: z.literal(false),
    kind: z.enum([
      "bad_request",
      "rate_limited",
      "provider_error",
      "timeout",
      "invalid_output",
    ]),
    errors: z.array(errorSchema).max(1000),
  })
  .strict();
export class AIError extends Error {
  constructor(
    public kind: string,
    public errors: ValidationError[],
  ) {
    super(
      errors
        .map((error) => `${error.path}: ${error.message} (${error.code})`)
        .join("\n"),
    );
  }
}
export async function getCapabilities(signal: AbortSignal): Promise<boolean> {
  const response = await fetch("/api/capabilities", { signal });
  if (!response.ok) throw new Error("Capabilities unavailable.");
  return z
    .object({ aiEnabled: z.boolean() })
    .strict()
    .parse(await response.json()).aiEnabled;
}
export async function requestDesign(
  prompt: string,
  signal: AbortSignal,
): Promise<Design> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal,
  });
  const body: unknown = await response.json();
  const failed = failureSchema.safeParse(body);
  if (failed.success) throw new AIError(failed.data.kind, failed.data.errors);
  const envelope = z
    .object({
      ok: z.literal(true),
      design: z.unknown(),
      meta: z
        .object({
          attempts: z.number().int().min(1).max(3),
          repaired: z.boolean(),
          model: z.string().max(100),
          latencyMs: z.number().min(0),
        })
        .passthrough(),
    })
    .strict()
    .safeParse(body);
  if (!response.ok || !envelope.success)
    throw new AIError("provider_error", [
      {
        path: "$",
        code: "response",
        message:
          "The server returned an unexpected response. Your design was kept.",
      },
    ]);
  const valid = validateDesign(envelope.data.design);
  if (!valid.ok) throw new AIError("invalid_output", valid.errors);
  return valid.design;
}
