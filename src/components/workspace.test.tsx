import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { samples } from "../ir/samples";
import { validateDesign } from "../ir/schema";
import { saveDesign, STORAGE_KEY } from "../services/persistence";
afterEach(() => vi.unstubAllGlobals());
function mount(index = 0) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ aiEnabled: false })),
  );
  saveDesign(localStorage, samples[index]);
  return render(<App />);
}
function current() {
  const design = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
  expect(validateDesign(design).ok).toBe(true);
  return design;
}
async function layers(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Layers" }));
  return screen.getByRole("tree", { name: "Component tree" });
}
describe("interactive workspace", () => {
  it("navigates, collapses, expands, and synchronizes tree/preview selection", async () => {
    const user = userEvent.setup();
    mount(2);
    const tree = await layers(user);
    const root = within(tree).getByRole("treeitem", {
      name: "Card dashboard-root",
    });
    root.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Text dash-label",
    );
    await user.keyboard("{End}");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Button dash-new",
    );
    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Stack dash-row",
    );
    await user.keyboard("{ArrowLeft}");
    expect(
      within(tree).queryByRole("treeitem", { name: "Button dash-new" }),
    ).toBeNull();
    await user.keyboard("{ArrowRight}");
    expect(
      within(tree).getByRole("treeitem", { name: "Button dash-new" }),
    ).toBeTruthy();
    await user.keyboard("{Home}{ArrowDown}");
    expect(
      within(tree)
        .getByRole("treeitem", { name: "Text dash-label" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Select dash-title" }));
    expect(
      within(tree)
        .getByRole("treeitem", { name: "Text dash-title" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("textbox", { name: "text" }).getAttribute("value"),
    ).toBe("Good things start here.");
  });
  it("edits all configurations, adds/removes components, and provides keyboard movement/reparenting", async () => {
    const user = userEvent.setup();
    mount(2);
    const tree = await layers(user);
    await user.click(
      within(tree)
        .getByRole("treeitem", { name: "Stack dash-row" })
        .querySelector(".tree-row")!,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "direction" }),
      "vertical",
    );
    expect(current().root.children[3].props.direction).toBe("vertical");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "align" }),
      "end",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "justify" }),
      "center",
    );
    const optional = screen.getByRole("textbox", { name: "background" });
    await user.type(optional, "#fff");
    await user.keyboard("{Enter}");
    expect(current().root.children[3].props.background).toBe("#fff");
    await user.clear(optional);
    await user.keyboard("{Enter}");
    expect(current().root.children[3].props.background).toBeUndefined();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "New component type" }),
      "Text",
    );
    await user.click(screen.getByRole("button", { name: "Add component" }));
    expect(
      within(tree)
        .getByRole("treeitem", { name: "Text node-1" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    const size = screen.getByRole("textbox", { name: "size" });
    await user.clear(size);
    await user.type(size, "24");
    await user.keyboard("{Enter}");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "weight" }),
      "bold",
    );
    const edited = current().root.children[3].children[2];
    expect(edited.props).toMatchObject({ size: 24, weight: "bold" });
    await user.click(screen.getByRole("button", { name: "Move up" }));
    expect(current().root.children[3].children[1].id).toBe("node-1");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Parent container" }),
      "dashboard-root",
    );
    expect(current().root.children[4].id).toBe("node-1");
    await user.click(screen.getByRole("button", { name: "Remove component" }));
    expect(
      within(tree).queryByRole("treeitem", { name: "Text node-1" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      within(tree)
        .getByRole("treeitem", { name: "Text node-1" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(
      within(tree).queryByRole("treeitem", { name: "Text node-1" }),
    ).toBeNull();
  });
  it("preserves accepted state on invalid property drafts and protects document undo from text shortcuts", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByText("Welcome back."));
    const input = screen.getByRole("textbox", { name: "text" });
    await user.clear(input);
    await user.type(input, "Edited title");
    await user.keyboard("{Enter}");
    expect(document.activeElement).toBe(input);
    const color = screen.getByRole("textbox", { name: "color" });
    await user.clear(color);
    await user.type(color, "javascript:alert(1)");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toContain(
      "root.children[1].props.color",
    );
    expect(current().root.children[1].props.color).toBe("ink");
    input.focus();
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(current().root.children[1].props.text).toBe("Edited title");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("textbox", { name: "text" }).getAttribute("value"),
    ).toBe("Welcome back.");
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.keyDown(document.body, {
      key: "z",
      ctrlKey: true,
      shiftKey: true,
    });
    await waitFor(() =>
      expect(current().root.children[1].props.text).toBe("Edited title"),
    );
    fireEvent.keyDown(document.body, { key: "z", metaKey: true });
    await waitFor(() =>
      expect(current().root.children[1].props.text).toBe("Welcome back."),
    );
    fireEvent.keyDown(document.body, { key: "y", ctrlKey: true });
    await waitFor(() =>
      expect(current().root.children[1].props.text).toBe("Edited title"),
    );
  });
  it("undoes generated replacements and persists only the currently accepted design", async () => {
    const user = userEvent.setup();
    mount();
    const prompt = screen.getByLabelText("Describe your interface");
    await user.clear(prompt);
    await user.type(prompt, "pricing");
    await user.click(screen.getByRole("button", { name: /Generate sample/ }));
    expect(current().id).toBe("pricing");
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(current().id).toBe("login");
    await user.click(screen.getByRole("button", { name: "Redo" }));
    expect(current().id).toBe("pricing");
  });
  it("validates native tree drops, rejects leaf nesting, and ignores external payloads", async () => {
    const user = userEvent.setup();
    const view = mount(2);
    const tree = await layers(user);
    const transfer = {
      setData: vi.fn(),
      getData: vi.fn(() => "<script>alert(1)</script>"),
      effectAllowed: "",
      dropEffect: "",
    };
    const source = within(tree)
      .getByRole("treeitem", { name: "Text dash-title" })
      .querySelector(".tree-row")!;
    fireEvent.dragStart(source, { dataTransfer: transfer });
    const before = view.container.querySelector(
      '[data-drop="dash-label:before"]',
    )!;
    fireEvent.dragOver(before, { dataTransfer: transfer });
    expect(before.className).toContain("drop-valid");
    fireEvent.drop(before, { dataTransfer: transfer });
    await waitFor(() =>
      expect(current().root.children[0].id).toBe("dash-title"),
    );
    fireEvent.dragStart(
      within(tree)
        .getByRole("treeitem", { name: "Text dash-title" })
        .querySelector(".tree-row")!,
      { dataTransfer: transfer },
    );
    const invalid = view.container.querySelector(
      '[data-drop="dash-new:inside"]',
    )!;
    fireEvent.dragOver(invalid, { dataTransfer: transfer });
    expect(invalid.className).toContain("drop-invalid");
    fireEvent.drop(invalid, { dataTransfer: transfer });
    expect(screen.getByRole("alert").textContent).toContain("leaf_destination");
    expect(current().root.children[0].id).toBe("dash-title");
    fireEvent.drop(tree, { dataTransfer: transfer });
    expect(screen.getByRole("status").textContent).toContain(
      "Choose a component from this tree",
    );
    expect(transfer.getData).not.toHaveBeenCalled();
    expect(view.container.querySelector("script")).toBeNull();
  });
  it("accepts AI-produced IR into editing/history and cancels generation when the workspace changes", async () => {
    let resolve: ((value: Response) => void) | undefined;
    let requestSignal: AbortSignal | undefined;
    const fetcher = vi.fn((url: string, init?: RequestInit) =>
      url === "/api/capabilities"
        ? Promise.resolve(Response.json({ aiEnabled: true }))
        : new Promise<Response>((done) => {
            resolve = done;
            requestSignal = init?.signal as AbortSignal;
          }),
    );
    vi.stubGlobal("fetch", fetcher);
    saveDesign(localStorage, samples[0]);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/AI sends your prompt/);
    await user.click(screen.getByRole("radio", { name: "AI (server)" }));
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    await act(async () =>
      resolve?.(
        Response.json({
          ok: true,
          design: samples[2],
          meta: { attempts: 1, repaired: false, model: "mock", latencyMs: 1 },
        }),
      ),
    );
    await screen.findByText("Good things start here.");
    await user.click(screen.getByText("Good things start here."));
    const aiSize = screen.getByRole("textbox", { name: "size" });
    await user.clear(aiSize);
    await user.type(aiSize, "40");
    await user.keyboard("{Enter}");
    expect(current().root.children[1].props.size).toBe(40);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(current().root.children[1].props.size).toBe(32);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(current().id).toBe("login");
    await user.click(screen.getByRole("button", { name: /Generate with AI/ }));
    await user.click(screen.getByText("Welcome back."));
    const text = screen.getByRole("textbox", { name: "text" });
    await user.clear(text);
    await user.type(text, "Keep this edit");
    await user.keyboard("{Enter}");
    expect(requestSignal?.aborted).toBe(true);
    expect((await screen.findByRole("alert")).textContent).toContain(
      "design changed",
    );
    await act(async () =>
      resolve?.(
        Response.json({
          ok: true,
          design: samples[1],
          meta: { attempts: 1, repaired: false, model: "mock", latencyMs: 1 },
        }),
      ),
    );
    expect(current().id).toBe("login");
    expect(current().root.children[1].props.text).toBe("Keep this edit");
    expect(
      screen.getByRole("button", { name: /Generate with AI/ }),
    ).toBeTruthy();
  });
});
