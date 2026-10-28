import { describe, it, expect } from "vitest";
import {
  createEditor,
  editorReducer,
  HISTORY_LIMIT,
  HISTORY_BYTES,
  type EditorState,
} from "./history";
import { samples } from "../ir/samples";
import { validateDesign } from "../ir/schema";
const change = (state: EditorState, text: string) =>
  editorReducer(state, {
    type: "edit",
    command: { kind: "props", id: "login-title", patch: { text } },
  });
describe("bounded validated history", () => {
  it("undoes/redoes consecutive edits deterministically and branches by clearing redo", () => {
    const initial = createEditor(samples[0]);
    let state = change(change(initial, "First"), "Second");
    const final = state.present.design;
    const before = JSON.stringify(state);
    expect(change(change(initial, "First"), "Second")).toEqual(state);
    expect(JSON.stringify(state)).toBe(before);
    state = editorReducer(state, { type: "undo" });
    state = editorReducer(state, { type: "undo" });
    expect(state.present.design).toEqual(samples[0]);
    expect(editorReducer(state, { type: "undo" })).toBe(state);
    state = editorReducer(editorReducer(state, { type: "redo" }), {
      type: "redo",
    });
    expect(state.present.design).toEqual(final);
    expect(editorReducer(state, { type: "redo" })).toBe(state);
    state = editorReducer(state, { type: "undo" });
    state = change(state, "Branch");
    expect(state.future).toEqual([]);
    expect(validateDesign(state.present.design).ok).toBe(true);
  });
  it("does not add history for selection, no-ops or invalid edits and keeps redo after rejection", () => {
    let state = change(createEditor(samples[0]), "First");
    state = editorReducer(state, { type: "undo" });
    const future = state.future;
    state = editorReducer(state, { type: "select", id: "login-title" });
    expect(state.past).toHaveLength(0);
    state = editorReducer(state, {
      type: "edit",
      command: {
        kind: "props",
        id: "login-title",
        patch: { color: "javascript:evil" },
      },
    });
    expect(state.error).toContain("root.children[1].props.color");
    expect(state.future).toBe(future);
    expect(state.present.design).toEqual(samples[0]);
    state = change(state, "Welcome back.");
    expect(state.past).toHaveLength(0);
    expect(state.future).toBe(future);
    expect(editorReducer(state, { type: "select", id: "missing" })).toBe(state);
  });
  it("restores selection for subtree removal and makes generation/reset undoable", () => {
    let state = editorReducer(createEditor(samples[2]), {
      type: "select",
      id: "dash-new",
    });
    state = editorReducer(state, {
      type: "edit",
      command: { kind: "remove", id: "dash-row" },
    });
    expect(state.present.selectedId).toBe("dashboard-root");
    state = editorReducer(state, { type: "undo" });
    expect(state.present.selectedId).toBe("dash-new");
    state = editorReducer(state, { type: "replace", candidate: samples[0] });
    expect(state.present.selectedId).toBe("login-root");
    state = editorReducer(state, { type: "undo" });
    expect(state.present.design).toEqual(samples[2]);
    state = editorReducer(state, { type: "replace", candidate: { bad: true } });
    expect(state.present.design).toEqual(samples[2]);
    expect(state.error).toBeTruthy();
  });
  it("bounds combined history by entries and UTF-8 bytes while preserving the nearest states", () => {
    let state = createEditor(samples[0]);
    for (let i = 0; i < 100; i++) state = change(state, `Edit ${i}`);
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    for (let i = 0; i < 15; i++) state = editorReducer(state, { type: "undo" });
    expect(state.past.length + state.future.length).toBeLessThanOrEqual(
      HISTORY_LIMIT,
    );
    const large = JSON.parse(JSON.stringify(samples[0]));
    large.root.children = Array.from({ length: 150 }, (_, i) => ({
      id: `text-${i}`,
      type: "Text",
      props: {
        text: "x".repeat(2000),
        color: "ink",
        size: 16,
        weight: "regular",
      },
    }));
    state = createEditor(large);
    for (let i = 0; i < 60; i++)
      state = editorReducer(state, {
        type: "edit",
        command: { kind: "props", id: "text-0", patch: { text: `${i}` } },
      });
    expect(state.past.length).toBeLessThan(HISTORY_LIMIT);
    expect(
      [...state.past, ...state.future].reduce(
        (sum, item) =>
          sum + new TextEncoder().encode(JSON.stringify(item)).byteLength,
        0,
      ),
    ).toBeLessThanOrEqual(HISTORY_BYTES);
  });
  it("rejects invalid history states defensively without replacing the current design", () => {
    const initial = createEditor(samples[0]);
    const tampered = {
      ...initial,
      past: [
        {
          ...initial.present,
          design: {
            ...samples[0],
            schemaVersion: "bad",
          } as unknown as (typeof samples)[0],
        },
      ],
    };
    const result = editorReducer(tampered, { type: "undo" });
    expect(result.present).toBe(initial.present);
    expect(result.error).toContain("invalid design");
  });
});
