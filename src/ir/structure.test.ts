import { describe, it, expect } from "vitest";
import { samples } from "./samples";
import {
  createNode,
  insertNode,
  moveNode,
  removeNode,
  locateNode,
} from "./structure";
import {
  MAX_DEPTH,
  MAX_NODES,
  requireDesign,
  validateDesign,
  type Design,
} from "./schema";
function accepted(result: ReturnType<typeof insertNode>): Design {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.design;
}
describe("immutable structural operations", () => {
  it("creates all five supported types with deterministic unique IDs and validates insertions", () => {
    let design = samples[0];
    const original = JSON.stringify(design);
    for (const type of ["Stack", "Text", "Button", "Input", "Card"] as const) {
      const node = createNode(design, type);
      expect(node).toEqual(createNode(design, type));
      design = accepted(insertNode(design, design.root.id, node, 0));
      expect(validateDesign(design).ok).toBe(true);
    }
    expect(JSON.stringify(samples[0])).toBe(original);
    expect(design.root).not.toBe(samples[0].root);
  });
  it("reorders within a container and reparents subtrees without changing their IDs", () => {
    let design = samples[2];
    const before = JSON.stringify(design);
    design = accepted(moveNode(design, "dash-title", design.root.id, 0));
    expect(locateNode(design.root, "dash-title")?.index).toBe(0);
    design = accepted(moveNode(design, "dash-title", "dash-row", 1));
    expect(locateNode(design.root, "dash-title")?.parent?.id).toBe("dash-row");
    expect(locateNode(design.root, "dash-title")?.index).toBe(1);
    expect(JSON.stringify(samples[2])).toBe(before);
    design = accepted(removeNode(design, "dash-row"));
    expect(locateNode(design.root, "dash-title")).toBeUndefined();
  });
  it("rejects roots, unknown nodes, leaf destinations, cycles, duplicate IDs, invalid types and positions", () => {
    const design = samples[2];
    const bad = [
      removeNode(design, design.root.id),
      removeNode(design, "missing"),
      moveNode(design, design.root.id, "dash-row"),
      moveNode(design, "dash-row", "dash-new"),
      moveNode(design, "dash-row", "dash-row"),
      moveNode(design, "dash-title", "dash-new"),
      moveNode(design, "missing", design.root.id),
      moveNode(design, "dash-title", design.root.id, -1),
      moveNode(design, "dash-title", design.root.id, 99),
      moveNode(design, "dash-title", design.root.id, 1.5),
      insertNode(design, "dash-title", createNode(design, "Text")),
      insertNode(design, design.root.id, design.root),
      insertNode(design, design.root.id, {
        id: "bad",
        type: "Script",
        props: {},
      }),
      insertNode(design, "missing", {}),
    ];
    for (const result of bad) expect(result.ok).toBe(false);
    const nested = accepted(
      insertNode(design, "dash-row", {
        id: "nested",
        type: "Card",
        props: { padding: 0, gap: 0, background: "paper" },
        children: [],
      }),
    );
    expect(moveNode(nested, "dash-row", "nested")).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ code: "cyclic_move" })],
    });
  });
  it("rejects operations exceeding depth or total node limits and invalid starting designs", () => {
    let design = samples[0];
    let parent = design.root.id;
    for (let depth = 1; depth < MAX_DEPTH; depth++) {
      const node = createNode(design, "Card");
      design = accepted(insertNode(design, parent, node));
      parent = node.id;
    }
    expect(insertNode(design, parent, createNode(design, "Text")).ok).toBe(
      false,
    );
    const leaf = createNode(samples[0], "Text");
    const full = requireDesign({
      ...samples[0],
      root: {
        ...samples[0].root,
        children: Array.from({ length: MAX_NODES - 1 }, (_, i) => ({
          ...leaf,
          id: `text-${i}`,
        })),
      },
    });
    expect(insertNode(full, full.root.id, createNode(full, "Text")).ok).toBe(
      false,
    );
    const invalid = {
      ...samples[0],
      schemaVersion: "unknown",
    } as unknown as Design;
    expect(removeNode(invalid, "login-title").ok).toBe(false);
    expect(moveNode(invalid, "login-title", "login-root").ok).toBe(false);
    expect(insertNode(invalid, "login-root", leaf).ok).toBe(false);
  });
});
