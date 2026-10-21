import type { CSSProperties } from "react";
import { type DesignNode, tokens, spacing } from "./schema";
export function resolveColor(value: string): string {
  return Object.prototype.hasOwnProperty.call(tokens, value)
    ? tokens[value as keyof typeof tokens]
    : value;
}
function resolveSpace(value: number | keyof typeof spacing): number {
  return typeof value === "number" ? value : spacing[value];
}
// Each mapping is explicit; no IR object is spread into a style or DOM object.
export function nodeStyle(node: DesignNode): CSSProperties {
  switch (node.type) {
    case "Stack":
      return {
        display: "flex",
        flexDirection: node.props.direction === "vertical" ? "column" : "row",
        gap: resolveSpace(node.props.gap),
        padding: resolveSpace(node.props.padding),
        alignItems: {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          stretch: "stretch",
        }[node.props.align],
        justifyContent: {
          start: "flex-start",
          center: "center",
          end: "flex-end",
          between: "space-between",
        }[node.props.justify],
        background: node.props.background
          ? resolveColor(node.props.background)
          : undefined,
      };
    case "Card":
      return {
        display: "flex",
        flexDirection: "column",
        padding: resolveSpace(node.props.padding),
        gap: resolveSpace(node.props.gap),
        background: resolveColor(node.props.background),
        color: node.props.color ? resolveColor(node.props.color) : undefined,
        borderRadius: 16,
        border: "1px solid #dfe3eb",
        boxShadow: "0 12px 36px #17212f08",
      };
    case "Text":
      return {
        margin: 0,
        color: resolveColor(node.props.color),
        fontSize: node.props.size,
        fontWeight: { regular: 400, medium: 500, bold: 700 }[node.props.weight],
        lineHeight: 1.4,
        overflowWrap: "anywhere",
      };
    case "Button":
      return {
        color: resolveColor(node.props.color),
        background: resolveColor(node.props.background),
        padding: resolveSpace(node.props.padding),
        border: 0,
        borderRadius: 8,
        font: "inherit",
        cursor: "pointer",
      };
    case "Input":
      return {
        color: resolveColor(node.props.color),
        background: resolveColor(node.props.background),
        padding: resolveSpace(node.props.padding),
        border: "1px solid #dfe3eb",
        borderRadius: 8,
        font: "inherit",
        minWidth: 0,
      };
  }
}
