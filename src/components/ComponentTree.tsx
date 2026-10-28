import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { Design, DesignNode } from "../ir/schema";
import { findNode } from "../ir/edit";
import { locateNode, moveNode } from "../ir/structure";
import type { Command } from "../editor/history";
export function ComponentTree({
  design,
  selectedId,
  onSelect,
  onCommand,
}: {
  design: Design;
  selectedId: string;
  onSelect: (id: string) => void;
  onCommand: (command: Command) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<string | null>(null);
  const [hover, setHover] = useState<{ key: string; valid: boolean } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const refs = useRef(new Map<string, HTMLLIElement>());
  const expanded = (node: DesignNode) =>
    !collapsed.has(node.id) ||
    (node.id !== selectedId && Boolean(findNode(node, selectedId)));
  const visible: DesignNode[] = [];
  function collect(node: DesignNode) {
    visible.push(node);
    if ("children" in node && expanded(node)) node.children.forEach(collect);
  }
  collect(design.root);
  function toggle(node: DesignNode, open: boolean) {
    setCollapsed((before) => {
      const next = new Set(before);
      if (open) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
    if (!open) onSelect(node.id);
  }
  function select(id: string) {
    onSelect(id);
    refs.current.get(id)?.focus();
  }
  function navigate(event: KeyboardEvent<HTMLLIElement>, node: DesignNode) {
    event.stopPropagation();
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button") &&
      ["Enter", " "].includes(event.key)
    )
      return;
    const index = visible.findIndex((item) => item.id === node.id);
    let next: string | undefined;
    switch (event.key) {
      case "ArrowDown":
        next = visible[Math.min(index + 1, visible.length - 1)]?.id;
        break;
      case "ArrowUp":
        next = visible[Math.max(index - 1, 0)]?.id;
        break;
      case "Home":
        next = visible[0]?.id;
        break;
      case "End":
        next = visible[visible.length - 1]?.id;
        break;
      case "ArrowRight":
        if ("children" in node) {
          if (!expanded(node)) toggle(node, true);
          else next = node.children[0]?.id;
        }
        break;
      case "ArrowLeft":
        if ("children" in node && expanded(node)) toggle(node, false);
        else next = locateNode(design.root, node.id)?.parent?.id;
        break;
      case "Enter":
      case " ":
        next = node.id;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next) select(next);
  }
  function destination(
    sourceId: string,
    targetId: string,
    position: "before" | "inside" | "after",
  ): Extract<Command, { kind: "move" }> | undefined {
    const target = locateNode(design.root, targetId);
    const source = locateNode(design.root, sourceId);
    if (!target || !source) return;
    if (position === "inside")
      return { kind: "move", id: sourceId, parentId: targetId };
    if (!target.parent) return;
    let index = target.index + (position === "after" ? 1 : 0);
    if (source.parent?.id === target.parent.id && source.index < index) index--;
    return { kind: "move", id: sourceId, parentId: target.parent.id, index };
  }
  function over(
    event: DragEvent,
    targetId: string,
    position: "before" | "inside" | "after",
  ) {
    event.stopPropagation();
    if (!drag) return;
    const command = destination(drag, targetId, position);
    const valid = Boolean(
      command &&
        moveNode(design, command.id, command.parentId, command.index).ok,
    );
    event.preventDefault();
    event.dataTransfer.dropEffect = valid ? "move" : "none";
    setHover({ key: `${targetId}:${position}`, valid });
  }
  function drop(
    event: DragEvent,
    targetId: string,
    position: "before" | "inside" | "after",
  ) {
    event.preventDefault();
    event.stopPropagation();
    // External text/HTML/JSON payloads are intentionally never read or parsed.
    const command = drag ? destination(drag, targetId, position) : undefined;
    if (command) {
      const valid = moveNode(
        design,
        command.id,
        command.parentId,
        command.index,
      ).ok;
      onCommand(command);
      setMessage(
        valid
          ? "Move accepted."
          : "Move rejected. Your design was kept; review the editing error.",
      );
    } else
      setMessage(
        "Choose a component from this tree and a valid destination. The root cannot be reordered.",
      );
    setDrag(null);
    setHover(null);
  }
  function row(node: DesignNode) {
    const container = "children" in node;
    const open = container && expanded(node);
    const label =
      "text" in node.props
        ? node.props.text
        : "placeholder" in node.props
          ? node.props.placeholder
          : node.id === design.root.id
            ? design.name
            : node.id;
    return (
      <li
        key={node.id}
        role="treeitem"
        aria-label={`${node.type} ${node.id}`}
        aria-selected={node.id === selectedId}
        aria-expanded={container ? open : undefined}
        tabIndex={node.id === selectedId ? 0 : -1}
        ref={(element) => {
          if (element) refs.current.set(node.id, element);
          else refs.current.delete(node.id);
        }}
        onKeyDown={(event) => navigate(event, node)}
        onClick={(event) => {
          event.stopPropagation();
          select(node.id);
        }}
      >
        <div
          className={`tree-row ${node.id === selectedId ? "is-selected" : ""} ${drag === node.id ? "is-dragging" : ""}`}
          draggable={node.id !== design.root.id}
          onDragStart={(event) => {
            event.stopPropagation();
            if (node.id === design.root.id) {
              event.preventDefault();
              return;
            }
            onSelect(node.id);
            setDrag(node.id);
            setMessage(
              "Drop before, inside, or after a row. Move controls offer a keyboard alternative.",
            );
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("application/x-forma-node", node.id);
          }}
          onDragEnd={() => {
            setDrag(null);
            setHover(null);
          }}
        >
          {container ? (
            <button
              type="button"
              tabIndex={-1}
              className="tree-toggle"
              aria-label={`${open ? "Collapse" : "Expand"} ${node.id}`}
              onClick={(event) => {
                event.stopPropagation();
                toggle(node, !open);
              }}
            >
              {open ? "▾" : "▸"}
            </button>
          ) : (
            <span className="tree-leaf">·</span>
          )}
          <span className="tree-type">{node.type}</span>
          <span className="tree-label" title={node.id}>
            {label.slice(0, 42) || node.id}
          </span>
        </div>
        {drag && (
          <div className="tree-dropzones" aria-hidden="true">
            {(["before", "inside", "after"] as const).map((position) => (
              <span
                key={position}
                data-drop={`${node.id}:${position}`}
                className={
                  hover?.key === `${node.id}:${position}`
                    ? hover.valid
                      ? "drop-valid"
                      : "drop-invalid"
                    : ""
                }
                onDragOver={(event) => over(event, node.id, position)}
                onDrop={(event) => drop(event, node.id, position)}
              >
                {position}
                {hover?.key === `${node.id}:${position}`
                  ? hover.valid
                    ? " ✓"
                    : " ×"
                  : ""}
              </span>
            ))}
          </div>
        )}
        {container && open && <ul role="group">{node.children.map(row)}</ul>}
      </li>
    );
  }
  return (
    <section
      className={`component-tree ${drag ? "is-sorting" : ""}`}
      aria-label="Component hierarchy"
    >
      <div className="tree-heading">
        <strong>Layers</strong>
        <span>{visible.length} visible</span>
      </div>
      <p id="tree-help" className="tree-help">
        Arrow keys navigate. Right expands; Left collapses or selects the
        parent. Drag a row or use the inspector’s move controls.
      </p>
      <ul
        role="tree"
        aria-label="Component tree"
        aria-describedby="tree-help"
        onDragOver={(event) => {
          event.preventDefault();
          if (!drag) event.dataTransfer.dropEffect = "none";
        }}
        onDrop={(event) => drop(event, design.root.id, "inside")}
      >
        {row(design.root)}
      </ul>
      {message && (
        <p className="tree-help" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
