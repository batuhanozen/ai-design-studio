import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type DesignNode, validateDesign } from "../ir/schema";
import { samples } from "../ir/samples";
import { updateNodeProps } from "../ir/edit";
import { RenderNode } from "./Preview";
import App from "../App";
import { STORAGE_KEY, saveDesign } from "../services/persistence";
describe("safe rendering boundaries", () => {
  it("shows an inert placeholder for an unknown type", () => {
    render(
      <RenderNode
        node={
          { id: "unknown", type: "Script", props: {} } as unknown as DesignNode
        }
      />,
    );
    expect(screen.getByText("Unsupported element")).toBeTruthy();
  });
  it("renders hostile markup as literal text without injecting elements", () => {
    const text =
      "<script>alert(1)</script><img src=x onerror=alert(1)>{` ${test} `}";
    const result = updateNodeProps(samples[0], "login-title", { text });
    if (!result.ok) throw new Error("Fixture failed");
    const { container } = render(<RenderNode node={result.design.root} />);
    expect(screen.getByText(text)).toBeTruthy();
    expect(container.querySelector("script,img")).toBeNull();
  });
  it("does not pass unknown props to the DOM", () => {
    const { container } = render(
      <RenderNode
        node={
          {
            id: "bad",
            type: "Text",
            props: {
              text: "Hello",
              color: "ink",
              size: 16,
              weight: "regular",
              "data-unsafe": "yes",
              onClick: "alert(1)",
            },
          } as unknown as DesignNode
        }
      />,
    );
    expect(container.querySelector("[data-unsafe],[onclick]")).toBeNull();
    expect(screen.getByText("Unsupported element")).toBeTruthy();
  });
});
describe("editor flow", () => {
  it("selects a node, commits valid text and rejects an invalid color without corrupting storage", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText("Welcome back."));
    expect(screen.getByText("login-title")).toBeTruthy();
    const textInput = screen.getByRole("textbox", { name: "text" });
    await user.clear(textInput);
    await user.type(textInput, "My workspace");
    await user.tab();
    expect(screen.getByText("My workspace")).toBeTruthy();
    const color = screen.getByRole("textbox", { name: "color" });
    await user.clear(color);
    await user.type(color, "javascript:alert(1)");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toContain(
      "root.children[1].props.color",
    );
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(validateDesign(restored).ok).toBe(true);
    expect(restored.root.children[1].props.color).toBe("ink");
    await user.click(screen.getByRole("button", { name: "{ } JSON" }));
    expect(screen.getByLabelText("Design JSON").textContent).toContain(
      "My workspace",
    );
  });
  it("generates a template, restores saved edits, shows recovery, and resets", async () => {
    const user = userEvent.setup();
    saveDesign(localStorage, samples[1]);
    const view = render(<App />);
    expect(screen.getByText("Make room for more.")).toBeTruthy();
    view.unmount();
    localStorage.setItem(STORAGE_KEY, "broken");
    render(<App />);
    expect(screen.getByRole("status").textContent).toContain(
      "could not be restored",
    );
    const prompt = screen.getByLabelText("Describe your interface");
    await user.clear(prompt);
    await user.type(prompt, "dashboard header");
    await user.click(screen.getByRole("button", { name: /Generate sample/ }));
    expect(screen.getByText("Good things start here.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Reset to sample" }));
    expect(screen.getByText("Welcome back.")).toBeTruthy();
  });
  it("offers code copy and download, with visible clipboard failure feedback", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Export component/ }));
    expect(screen.getByLabelText("React component").textContent).toContain(
      "GeneratedDesign",
    );
    const writeText = vi.fn().mockRejectedValue(new Error("blocked"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("status").textContent).toContain("Use Download");
    writeText.mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("status").textContent).toContain("Copied");
    const create = vi.fn(() => "blob:export");
    Object.defineProperty(URL, "createObjectURL", {
      value: create,
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(create).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
  });
});
