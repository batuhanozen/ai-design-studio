// @vitest-environment node
import { expect, it, vi } from "vitest";
import { createOpenAIProvider } from "./openai";
const mock = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mock.create };
  },
}));
const request = {
  model: "configured",
  system: "JSON",
  user: "request",
  maxOutputTokens: 900,
  signal: new AbortController().signal,
};
it.each([
  [{ status: "incomplete", output_text: "{}" }, "provider_incomplete"],
  [
    {
      status: "completed",
      output: [
        { type: "message", content: [{ type: "refusal", refusal: "PRIVATE" }] },
      ],
    },
    "provider_refusal",
  ],
  [{ status: "failed", error: { message: "PRIVATE" } }, "provider_unavailable"],
])(
  "does not treat an incomplete/refused/failed response as repairable JSON",
  async (response, code) => {
    mock.create.mockResolvedValueOnce(response);
    await expect(
      createOpenAIProvider("test").generateIR(request),
    ).rejects.toMatchObject({ code });
  },
);
it("maps SDK errors without exposing the original message", async () => {
  mock.create.mockRejectedValueOnce({ status: 401, message: "SECRET" });
  await expect(
    createOpenAIProvider("test").generateIR(request),
  ).rejects.toMatchObject({ code: "provider_auth" });
});
