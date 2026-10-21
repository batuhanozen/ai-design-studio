import {
  type Design,
  type DesignNode,
  type ValidationResult,
  validateDesign,
} from "./schema";
export function findNode(node: DesignNode, id: string): DesignNode | undefined {
  if (node.id === id) return node;
  if ("children" in node)
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
}
export function updateNodeProps(
  design: Design,
  id: string,
  patch: Record<string, unknown>,
): ValidationResult {
  if (!findNode(design.root, id))
    return {
      ok: false,
      errors: [
        {
          path: "root",
          code: "not_found",
          message: "Selected node no longer exists.",
        },
      ],
    };
  function update(node: DesignNode): unknown {
    return {
      ...node,
      ...(node.id === id ? { props: { ...node.props, ...patch } } : {}),
      ...("children" in node ? { children: node.children.map(update) } : {}),
    };
  }
  return validateDesign({ ...design, root: update(design.root) });
}
