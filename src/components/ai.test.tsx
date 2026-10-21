import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { samples } from "../ir/samples";
import { validateDesign } from "../ir/schema";
import { STORAGE_KEY } from "../services/persistence";
afterEach(() => vi.unstubAllGlobals());
const success = (design: unknown = samples[2]) =>
  Response.json({
    ok: true,
    design,
    meta: { attempts: 1, repaired: false, model: "test-model", latencyMs: 1 },
  });
function mockServer(
  generate: (init?: RequestInit) => Promise<Response>,
  enabled = true,
) {
  const fetcher = vi.fn((url: string, init?: RequestInit) =>
    url === "/api/capabilities"
      ? Promise.resolve(Response.json({ aiEnabled: enabled }))
      : generate(init),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
async function enableAI() {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText(/AI sends your prompt/);
  await user.click(screen.getByRole("radio", { name: "AI (server)" }));
  return user;
}
describe("AI client integration", () => {
  it("clearly labels modes and disables AI when capabilities are false while samples work", async () => {
    mockServer(async () => success(), false);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/AI is disabled/);
    const radio = screen.getByRole("radio", {
      name: "AI (server)",
    }) as HTMLInputElement;
    expect(radio.disabled).toBe(true);
    expect(
      (
        screen.getByRole("radio", {
          name: "Deterministic samples",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    const prompt = screen.getByLabelText("Describe your interface");
    await user.clear(prompt);
    await user.type(prompt, "pricing");
    await user.click(screen.getByRole("button", { name: /Generate sample/ }));
    expect(screen.getByText("Make room for more.")).toBeTruthy();
  });
  it("keeps samples available when the capabilities endpoint is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<App />);
    await screen.findByText(/AI server unavailable/);
    expect(
      (screen.getByRole("radio", { name: "AI (server)" }) as HTMLInputElement)
        .disabled,
    ).toBe(true);
  });
  it("accepts and persists a valid server design through the existing state path", async () => {
    const fetcher = mockServer(async () => success());
    const user = await enableAI();
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    await screen.findByText("Good things start here.");
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(validateDesign(stored).ok).toBe(true);
    expect(stored.id).toBe("dashboard");
    expect(fetcher.mock.calls[1][0]).toBe("/api/generate");
    expect(JSON.parse(fetcher.mock.calls[1][1]?.body as string)).toHaveProperty(
      "prompt",
    );
  });
  it("shows loading and cancels with AbortController; a late success cannot replace the design", async () => {
    let resolve: ((value: Response) => void) | undefined;
    let signal: AbortSignal | undefined;
    mockServer((init) => {
      signal = init?.signal as AbortSignal;
      return new Promise((done) => {
        resolve = done;
      });
    });
    const user = await enableAI();
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    expect(screen.getByRole("button", { name: /Generating/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cancel generation" }));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("cancelled");
    await act(async () => {
      resolve?.(success());
    });
    expect(screen.getByText("Welcome back.")).toBeTruthy();
    expect(screen.queryByText("Good things start here.")).toBeNull();
  });
  it.each(["invalid_output", "provider_error", "timeout", "rate_limited"])(
    "shows structured %s errors and preserves the current design",
    async (kind) => {
      mockServer(async () =>
        Response.json(
          {
            ok: false,
            kind,
            errors: [
              {
                path: "root.props.color",
                code: "custom",
                message: "A clear failure message.",
              },
            ],
          },
          { status: 502 },
        ),
      );
      const user = await enableAI();
      await user.click(
        screen.getByRole("button", { name: /Generate with AI/ }),
      );
      const error = await screen.findByRole("alert");
      expect(error.textContent).toContain(kind);
      expect(error.textContent).toContain("root.props.color");
      expect(error.textContent).toContain("custom");
      expect(screen.getByText("Welcome back.")).toBeTruthy();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    },
  );
  it("revalidates a tampered success envelope before rendering or persisting", async () => {
    mockServer(async () =>
      success({
        ...samples[0],
        root: { id: "bad", type: "Script", props: { onClick: "alert(1)" } },
      }),
    );
    const user = await enableAI();
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "invalid_union_discriminator",
    );
    expect(screen.getByText("Welcome back.")).toBeTruthy();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("handles malformed server envelopes without replacing the current design", async () => {
    mockServer(async () =>
      Response.json({ apiKey: "untrusted metadata", design: samples[2] }),
    );
    const user = await enableAI();
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "unexpected response",
      ),
    );
    expect(screen.getByText("Welcome back.")).toBeTruthy();
  });
});
