import { useState } from "react";
import type { Design } from "../ir/schema";
import { findNode } from "../ir/edit";
import { listNodes, locateNode, type NodeType } from "../ir/structure";
import type { Command } from "../editor/history";
const types: NodeType[] = ["Stack", "Text", "Button", "Input", "Card"];
export function StructureControls({
  design,
  selectedId,
  onCommand,
  onSelect,
}: {
  design: Design;
  selectedId: string;
  onCommand: (command: Command) => void;
  onSelect: (id: string) => void;
}) {
  const [type, setType] = useState<NodeType>("Text");
  const location = locateNode(design.root, selectedId);
  if (!location) return null;
  const { node, parent, index } = location;
  const addParent = "children" in node ? node : parent;
  const destinations = listNodes(design.root).filter(
    (item) => "children" in item && !findNode(node, item.id),
  );
  return (
    <section className="structure-controls" aria-label="Structure controls">
      <div className="section-label">STRUCTURE</div>
      <div className="structure-actions">
        <button
          disabled={!parent}
          onClick={() => parent && onSelect(parent.id)}
        >
          Select parent
        </button>
        <button
          disabled={!("children" in node) || node.children.length === 0}
          onClick={() => {
            if ("children" in node && node.children[0])
              onSelect(node.children[0].id);
          }}
        >
          Select first child
        </button>
      </div>
      <label className="field">
        <span>New component type</span>
        <select
          aria-label="New component type"
          value={type}
          onChange={(event) => {
            const value = event.target.value;
            const allowed = types.find((item) => item === value);
            if (allowed) setType(allowed);
          }}
        >
          {types.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <button
        className="structure-add"
        disabled={!addParent}
        onClick={() =>
          addParent &&
          onCommand({ kind: "add", parentId: addParent.id, nodeType: type })
        }
      >
        Add component
      </button>
      <p className="tree-help">
        Adds inside a selected container, or at the end of the selected
        element’s parent.
      </p>
      <div className="structure-actions">
        <button
          disabled={!parent || index === 0}
          onClick={() =>
            parent &&
            onCommand({
              kind: "move",
              id: node.id,
              parentId: parent.id,
              index: index - 1,
            })
          }
        >
          Move up
        </button>
        <button
          disabled={!parent || index === parent.children.length - 1}
          onClick={() =>
            parent &&
            onCommand({
              kind: "move",
              id: node.id,
              parentId: parent.id,
              index: index + 1,
            })
          }
        >
          Move down
        </button>
      </div>
      <label className="field">
        <span>Parent container</span>
        <select
          aria-label="Parent container"
          value={parent?.id ?? ""}
          disabled={!parent}
          onChange={(event) =>
            onCommand({
              kind: "move",
              id: node.id,
              parentId: event.target.value,
            })
          }
        >
          {!parent && <option value="">Root (fixed)</option>}
          {destinations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.type} · {item.id}
            </option>
          ))}
        </select>
      </label>
      <button
        className="structure-remove"
        disabled={!parent}
        onClick={() => onCommand({ kind: "remove", id: node.id })}
      >
        Remove component
      </button>
      <p className="tree-help">
        Removal includes descendants. Undo restores them.
      </p>
    </section>
  );
}
