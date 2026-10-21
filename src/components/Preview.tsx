import type { CSSProperties, ReactNode } from "react";
import { type Design, type DesignNode, validateDesign } from "../ir/schema";
import { nodeStyle } from "../ir/styles";
type EntryProps = {
  node: DesignNode;
  style: CSSProperties;
  children: ReactNode;
};
const registry = {
  Stack: ({ style, children }: EntryProps) => (
    <div style={style}>{children}</div>
  ),
  Card: ({ style, children }: EntryProps) => (
    <div style={style}>{children}</div>
  ),
  Text: ({ node, style }: EntryProps) => (
    <p style={style}>{node.type === "Text" ? node.props.text : ""}</p>
  ),
  Button: ({ node, style }: EntryProps) => (
    <button type="button" style={style}>
      {node.type === "Button" ? node.props.text : ""}
    </button>
  ),
  Input: ({ node, style }: EntryProps) => (
    <input
      aria-label={
        node.type === "Input" ? node.props.placeholder : "Preview input"
      }
      placeholder={node.type === "Input" ? node.props.placeholder : ""}
      style={style}
    />
  ),
};
export function RenderNode({
  node,
  selectedId,
  onSelect,
}: {
  node: DesignNode;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const result = validateDesign({
    schemaVersion: "1.0.0",
    id: "preview",
    name: "Preview",
    root: node,
  });
  if (!result.ok) return <div className="unsupported">Unsupported element</div>;
  const valid = result.design.root;
  const Component = registry[valid.type];
  if (!Component) return <div className="unsupported">Unsupported element</div>;
  return (
    <div
      className={`preview-node ${selectedId === valid.id ? "selected" : ""}`}
      data-node-id={valid.id}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(valid.id);
      }}
    >
      {onSelect && (
        <button
          className="select-node"
          aria-label={`Select ${valid.id}`}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(valid.id);
          }}
        >
          Select {valid.type}
        </button>
      )}
      <Component node={valid} style={nodeStyle(valid)}>
        {"children" in valid
          ? valid.children.map((child) => (
              <RenderNode
                key={child.id}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))
          : null}
      </Component>
    </div>
  );
}
export function Preview({
  design,
  selectedId,
  onSelect,
}: {
  design: Design;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const result = validateDesign(design);
  if (!result.ok) return <div className="unsupported">Unsupported element</div>;
  return (
    <RenderNode
      node={result.design.root}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
