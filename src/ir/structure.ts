import {
  type Design,
  type DesignNode,
  type ValidationResult,
  validateDesign,
} from "./schema";
import { findNode } from "./edit";
export type NodeType = DesignNode["type"];
export type NodeLocation = {
  node: DesignNode;
  parent?: DesignNode & { children: DesignNode[] };
  index: number;
};
export function locateNode(
  root: DesignNode,
  id: string,
  parent?: NodeLocation["parent"],
  index = 0,
): NodeLocation | undefined {
  if (root.id === id) return { node: root, parent, index };
  if ("children" in root)
    for (let i = 0; i < root.children.length; i++) {
      const found = locateNode(root.children[i], id, root, i);
      if (found) return found;
    }
}
function rejected(code: string, message: string): ValidationResult {
  return { ok: false, errors: [{ path: "root", code, message }] };
}
function mapChildren(
  node: DesignNode,
  id: string,
  children: DesignNode[],
): DesignNode {
  if (!("children" in node)) return node;
  return {
    ...node,
    children:
      node.id === id
        ? children
        : node.children.map((child) => mapChildren(child, id, children)),
  };
}
export function insertNode(
  candidate: Design,
  parentId: string,
  node: unknown,
  index?: number,
): ValidationResult {
  const valid = validateDesign(candidate);
  if (!valid.ok) return valid;
  const parent = findNode(valid.design.root, parentId);
  if (!parent)
    return rejected("not_found", "The destination no longer exists.");
  if (!("children" in parent))
    return rejected(
      "leaf_destination",
      "Only Stack and Card can contain components.",
    );
  const position = index ?? parent.children.length;
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position > parent.children.length
  )
    return rejected("invalid_index", "Choose a valid insertion position.");
  const children = [...parent.children];
  children.splice(position, 0, node as DesignNode);
  return validateDesign({
    ...valid.design,
    root: mapChildren(valid.design.root, parentId, children),
  });
}
export function removeNode(candidate: Design, id: string): ValidationResult {
  const valid = validateDesign(candidate);
  if (!valid.ok) return valid;
  const location = locateNode(valid.design.root, id);
  if (!location)
    return rejected("not_found", "The component no longer exists.");
  if (!location.parent)
    return rejected("root_operation", "The root cannot be removed.");
  return validateDesign({
    ...valid.design,
    root: mapChildren(
      valid.design.root,
      location.parent.id,
      location.parent.children.filter((child) => child.id !== id),
    ),
  });
}
// index is the final destination position after the source has been removed.
export function moveNode(
  candidate: Design,
  id: string,
  parentId: string,
  index?: number,
): ValidationResult {
  const valid = validateDesign(candidate);
  if (!valid.ok) return valid;
  const source = locateNode(valid.design.root, id);
  const target = findNode(valid.design.root, parentId);
  if (!source || !target)
    return rejected(
      "not_found",
      "The component or destination no longer exists.",
    );
  if (!source.parent)
    return rejected("root_operation", "The root cannot be moved.");
  if (!("children" in target))
    return rejected(
      "leaf_destination",
      "Only Stack and Card can contain components.",
    );
  if (findNode(source.node, parentId))
    return rejected(
      "cyclic_move",
      "A component cannot be moved into itself or its descendants.",
    );
  const removed = removeNode(valid.design, id);
  if (!removed.ok) return removed;
  return insertNode(removed.design, parentId, source.node, index);
}
export function createNode(design: Design, type: NodeType): DesignNode {
  let counter = 1;
  while (findNode(design.root, `node-${counter}`)) counter++;
  const id = `node-${counter}`;
  switch (type) {
    case "Stack":
      return {
        id,
        type,
        props: {
          direction: "vertical",
          gap: "md",
          padding: "md",
          align: "stretch",
          justify: "start",
        },
        children: [],
      };
    case "Card":
      return {
        id,
        type,
        props: { padding: "lg", gap: "md", background: "paper" },
        children: [],
      };
    case "Text":
      return {
        id,
        type,
        props: { text: "New text", color: "ink", size: 16, weight: "regular" },
      };
    case "Button":
      return {
        id,
        type,
        props: {
          text: "Button",
          color: "paper",
          background: "accent",
          padding: "md",
        },
      };
    case "Input":
      return {
        id,
        type,
        props: {
          placeholder: "Input",
          color: "ink",
          background: "surface",
          padding: "md",
        },
      };
  }
}
export function listNodes(node: DesignNode): DesignNode[] {
  return [
    node,
    ...("children" in node ? node.children.flatMap(listNodes) : []),
  ];
}
