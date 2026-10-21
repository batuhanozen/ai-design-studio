import { useState } from "react";
import { type Design, type DesignNode, formatErrors } from "../ir/schema";
import { updateNodeProps } from "../ir/edit";
function Field({
  name,
  value,
  onApply,
}: {
  name: string;
  value: string | number;
  onApply: (value: string) => string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  function apply() {
    setError(onApply(draft));
  }
  return (
    <label className="field">
      <span>{name}</span>
      <input
        aria-label={name}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onBlur={apply}
        onKeyDown={(event) => {
          if (event.key === "Enter") apply();
        }}
      />
      {error && <small role="alert">{error}</small>}
    </label>
  );
}
export function Inspector({
  design,
  node,
  onCommit,
}: {
  design: Design;
  node: DesignNode | undefined;
  onCommit: (design: Design) => void;
}) {
  if (!node) return <p>Select an element to edit its properties.</p>;
  const fields = Object.entries(node.props).filter(([key]) =>
    ["text", "placeholder", "color", "background", "gap", "padding"].includes(
      key,
    ),
  );
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
          key={`${node.id}-${name}-${String(value)}`}
          name={name}
          value={value}
          onApply={(draft) => {
            const parsed =
              ["padding", "gap"].includes(name) &&
              draft.trim() !== "" &&
              Number.isFinite(Number(draft))
                ? Number(draft)
                : draft;
            const result = updateNodeProps(design, node.id, { [name]: parsed });
            if (!result.ok) return formatErrors(result.errors);
            onCommit(result.design);
            return "";
          }}
        />
      ))}
      <p className="inspector-help">
        Changes apply on Enter or when you leave a field. Colors accept tokens,
        hex, or rgb. Spacing accepts 0–96 or none / xs / sm / md / lg / xl.
      </p>
    </>
  );
}
