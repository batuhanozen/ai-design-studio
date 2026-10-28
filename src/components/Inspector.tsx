import { useState } from "react";
import { type Design, type DesignNode, formatErrors } from "../ir/schema";
import { updateNodeProps } from "../ir/edit";
const options: Record<string, string[]> = {
  direction: ["vertical", "horizontal"],
  align: ["start", "center", "end", "stretch"],
  justify: ["start", "center", "end", "between"],
  weight: ["regular", "medium", "bold"],
};
function Field({
  name,
  value,
  revision,
  onApply,
}: {
  name: string;
  value: string | number;
  revision: number;
  onApply: (value: string) => string;
}) {
  const source = JSON.stringify([value, revision]);
  const [editing, setEditing] = useState({
    source,
    draft: String(value),
    error: "",
  });
  // Derive a fresh display from accepted props after history/external changes without remounting focused inputs.
  const current =
    editing.source === source
      ? editing
      : { source, draft: String(value), error: "" };
  function apply(draft = current.draft) {
    const error = onApply(draft);
    setEditing({ source, draft, error });
  }
  const choices = options[name];
  return (
    <label className="field">
      <span>{name}</span>
      {choices ? (
        <select
          aria-label={name}
          value={current.draft}
          onChange={(event) => apply(event.target.value)}
        >
          {choices.map((choice) => (
            <option key={choice}>{choice}</option>
          ))}
        </select>
      ) : (
        <input
          aria-label={name}
          value={current.draft}
          onChange={(event) =>
            setEditing({ ...current, draft: event.target.value, error: "" })
          }
          onBlur={() => apply()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply();
            }
          }}
        />
      )}
      {current.error && <small role="alert">{current.error}</small>}
    </label>
  );
}
export function Inspector({
  design,
  node,
  revision = 0,
  onEdit,
}: {
  design: Design;
  node: DesignNode | undefined;
  revision?: number;
  onEdit: (id: string, patch: Record<string, unknown>) => void;
}) {
  if (!node) return <p>Select an element to edit its properties.</p>;
  const fields: [string, string | number | undefined][] = Object.entries(
    node.props,
  );
  if (node.type === "Stack" && !("background" in node.props))
    fields.push(["background", ""]);
  if (node.type === "Card" && !("color" in node.props))
    fields.push(["color", ""]);
  return (
    <>
      <div className="selected-type">
        {node.type}
        <span>Selected element</span>
      </div>
      <p className="node-id">{node.id}</p>
      <div className="section-label">PROPERTIES</div>
      {fields.map(([name, value]) => (
        <Field
          key={`${node.id}-${name}`}
          name={name}
          value={value ?? ""}
          revision={revision}
          onApply={(draft) => {
            const optional =
              (node.type === "Stack" && name === "background") ||
              (node.type === "Card" && name === "color");
            const parsed =
              optional && draft === ""
                ? undefined
                : ["padding", "gap", "size"].includes(name) &&
                    draft.trim() !== "" &&
                    Number.isFinite(Number(draft))
                  ? Number(draft)
                  : draft;
            const patch = { [name]: parsed };
            const result = updateNodeProps(design, node.id, patch);
            if (!result.ok) return formatErrors(result.errors);
            onEdit(node.id, patch);
            return "";
          }}
        />
      ))}
      <p className="inspector-help">
        Text, colors, size and spacing apply on Enter or blur. Configuration
        choices apply immediately. Optional colors may be cleared. Spacing: 0–96
        or none / xs / sm / md / lg / xl.
      </p>
    </>
  );
}
