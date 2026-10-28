// @vitest-environment node
import { expect, it, vi } from "vitest";
import { classifyProviderError } from "./provider";
import { runPipeline } from "./pipeline";
import { readConfig } from "./config";
import { createAPI } from "./api";
it.each([
  [{ status: 401 }, "provider_error", "provider_auth"],
  [{ status: 403 }, "provider_error", "provider_auth"],
  [{ status: 404 }, "provider_error", "provider_model"],
  [{ status: 400 }, "provider_error", "provider_configuration"],
  [{ status: 429 }, "rate_limited", "provider_rate_limit"],
  [
    { status: 429, code: "insufficient_quota" },
    "provider_error",
    "provider_quota",
  ],
  [{ status: 503 }, "provider_error", "provider_unavailable"],
  [{ name: "APIConnectionTimeoutError" }, "timeout", "provider_timeout"],
  [{ name: "APIConnectionError" }, "provider_error", "provider_connection"],
  [null, "provider_error", "provider_error"],
])(
  "classifies provider failures without forwarding private diagnostics",
  async (error, kind, code) => {
    const safe = classifyProviderError({
      ...error,
      message: "PRIVATE prompt key output",
    });
    expect(safe.kind).toBe(kind);
    expect(safe.code).toBe(code);
    expect(safe.message).not.toContain("PRIVATE");
    const provider = { generateIR: vi.fn().mockRejectedValue(safe) };
    const report = await runPipeline(provider, "Login", {
      ...readConfig({}),
      model: "test",
    });
    expect(report.result).toMatchObject({
      ok: false,
      kind,
      errors: [expect.objectContaining({ code })],
    });
    expect(provider.generateIR).toHaveBeenCalledOnce();
  },
);
it("preserves typed upstream rate-limit status at the HTTP boundary", async () => {
  const api = createAPI(
    { ...readConfig({}), apiKey: "test", model: "test" },
    {
      generateIR: async () => {
        throw classifyProviderError({ status: 429 });
      },
    },
  );
  const response = await api(
    new Request("http://127.0.0.1:3001/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Login" }),
    }),
  );
  expect(response.status).toBe(429);
});
