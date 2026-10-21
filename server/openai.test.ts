// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createOpenAIProvider } from "./openai";
const mocks = vi.hoisted(() => ({ create: vi.fn(), constructor: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
    constructor(options: unknown) {
      mocks.constructor(options);
    }
  },
}));
it("uses one official SDK adapter with explicit model, JSON mode, no retries/storage/logs, signal and optional temperature", async () => {
  mocks.create.mockResolvedValue({
    output_text: "{}",
    usage: { input_tokens: 12, output_tokens: 4 },
  });
  const provider = createOpenAIProvider("CANARY");
  const signal = new AbortController().signal;
  const request = {
    model: "configured-model",
    system: "JSON contract",
    user: "untrusted request",
    maxOutputTokens: 900,
    signal,
  };
  expect(await provider.generateIR(request)).toEqual({
    text: "{}",
    usage: { inputTokens: 12, outputTokens: 4 },
  });
  expect(mocks.constructor).toHaveBeenCalledWith({
    apiKey: "CANARY",
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    logLevel: "off",
  });
  expect(mocks.create).toHaveBeenCalledWith(
    {
      model: "configured-model",
      instructions: "JSON contract",
      input: [{ role: "user", content: "untrusted request" }],
      text: { format: { type: "json_object" } },
      store: false,
      max_output_tokens: 900,
    },
    { signal, maxRetries: 0 },
  );
  await provider.generateIR({ ...request, temperature: 0.2 });
  expect(mocks.create.mock.calls[1][0].temperature).toBe(0.2);
});
