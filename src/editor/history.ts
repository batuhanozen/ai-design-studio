import {
  type Design,
  formatErrors,
  requireDesign,
  validateDesign,
} from "../ir/schema";
import { findNode, updateNodeProps } from "../ir/edit";
import {
  createNode,
  insertNode,
  locateNode,
  moveNode,
  removeNode,
  type NodeType,
} from "../ir/structure";
export const HISTORY_LIMIT = 40;
export const HISTORY_BYTES = 4 * 1024 * 1024;
export type Snapshot = { design: Design; selectedId: string };
export type EditorState = {
  present: Snapshot;
  past: Snapshot[];
  future: Snapshot[];
  error: string;
  revision: number;
};
export type Command =
  | { kind: "props"; id: string; patch: Record<string, unknown> }
  | { kind: "add"; parentId: string; nodeType: NodeType }
  | { kind: "remove"; id: string }
  | { kind: "move"; id: string; parentId: string; index?: number };
export type EditorAction =
  | { type: "select"; id: string }
  | { type: "edit"; command: Command }
  | { type: "replace"; candidate: unknown }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "clear-error" };
export function createEditor(candidate: unknown): EditorState {
  const design = requireDesign(candidate);
  return {
    present: { design, selectedId: design.root.id },
    past: [],
    future: [],
    error: "",
    revision: 0,
  };
}
function snapshot(design: Design, id: string): Snapshot {
  return {
    design,
    selectedId: findNode(design.root, id) ? id : design.root.id,
  };
}
function bytes(value: Snapshot): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
function bounded(items: Snapshot[]): Snapshot[] {
  const kept: Snapshot[] = [];
  let used = 0;
  // The last item is the next reachable state. Drop the oldest/farthest snapshots first.
  for (let i = items.length - 1; i >= 0 && kept.length < HISTORY_LIMIT; i--) {
    const size = bytes(items[i]);
    if (used + size > HISTORY_BYTES) break;
    kept.unshift(items[i]);
    used += size;
  }
  return kept;
}
function commit(
  state: EditorState,
  candidate: unknown,
  selectedId: string,
): EditorState {
  const result = validateDesign(candidate);
  if (!result.ok) return { ...state, error: formatErrors(result.errors) };
  if (JSON.stringify(result.design) === JSON.stringify(state.present.design))
    return {
      ...state,
      present: snapshot(state.present.design, selectedId),
      error: "",
    };
  return {
    present: snapshot(result.design, selectedId),
    past: bounded([...state.past, state.present]),
    future: [],
    error: "",
    revision: state.revision + 1,
  };
}
export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  if (action.type === "clear-error") return { ...state, error: "" };
  if (action.type === "select")
    return findNode(state.present.design.root, action.id)
      ? { ...state, present: { ...state.present, selectedId: action.id } }
      : state;
  if (action.type === "undo" || action.type === "redo") {
    const source = action.type === "undo" ? state.past : state.future;
    const next = source[source.length - 1];
    if (!next) return state;
    const valid = validateDesign(next.design);
    if (!valid.ok)
      return {
        ...state,
        error:
          "History contained an invalid design. The current design was kept.",
      };
    // Past and future share one budget by retaining the nearest states on each side.
    const destination = bounded([
      ...(action.type === "undo" ? state.future : state.past),
      state.present,
    ]);
    const remaining = source.slice(0, -1);
    const budget =
      HISTORY_BYTES - destination.reduce((sum, item) => sum + bytes(item), 0);
    let total = 0;
    const rest: Snapshot[] = [];
    for (
      let i = remaining.length - 1;
      i >= 0 && rest.length + destination.length < HISTORY_LIMIT;
      i--
    ) {
      total += bytes(remaining[i]);
      if (total > budget) break;
      rest.unshift(remaining[i]);
    }
    return {
      present: snapshot(valid.design, next.selectedId),
      past: action.type === "undo" ? rest : destination,
      future: action.type === "undo" ? destination : rest,
      error: "",
      revision: state.revision + 1,
    };
  }
  if (action.type === "replace") {
    const valid = validateDesign(action.candidate);
    return valid.ok
      ? commit(state, valid.design, valid.design.root.id)
      : { ...state, error: formatErrors(valid.errors) };
  }
  const { design, selectedId } = state.present;
  const command = action.command;
  let result;
  let nextSelection = selectedId;
  switch (command.kind) {
    case "props":
      result = updateNodeProps(design, command.id, command.patch);
      break;
    case "add": {
      const node = createNode(design, command.nodeType);
      result = insertNode(design, command.parentId, node);
      nextSelection = node.id;
      break;
    }
    case "remove": {
      const location = locateNode(design.root, command.id);
      result = removeNode(design, command.id);
      if (location && findNode(location.node, selectedId))
        nextSelection = location.parent?.id ?? design.root.id;
      break;
    }
    case "move":
      result = moveNode(design, command.id, command.parentId, command.index);
      break;
  }
  return result.ok
    ? commit(state, result.design, nextSelection)
    : { ...state, error: formatErrors(result.errors) };
}
