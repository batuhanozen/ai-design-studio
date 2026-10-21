import { type Design, type DesignNode, requireDesign } from "../ir/schema";
import { nodeStyle } from "../components/nodeStyle";
// JSON literals stay inside JSX expression positions. Escape HTML-significant characters too.
function literal(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
export function exportJSON(candidate: Design): string {
  return JSON.stringify(requireDesign(candidate), null, 2);
}
export function exportReact(
  candidate: Design,
  componentName = "GeneratedDesign",
): string {
  const design = requireDesign(candidate);
  // A deliberately narrow naming rule also excludes JS/TS keywords and reserved bindings.
  if (!/^[A-Z][A-Za-z0-9]{0,63}$/.test(componentName))
    throw new Error(
      "Use an uppercase ASCII component name containing only letters and digits.",
    );
  function emit(node: DesignNode): string {
    const style = ` style={${literal(nodeStyle(node))}}`;
    switch (node.type) {
      case "Stack":
      case "Card":
        return `<div${style}>${node.children.map(emit).join("\n")}</div>`;
      case "Text":
        return `<p${style}>{${literal(node.props.text)}}</p>`;
      case "Button":
        return `<button type="button"${style}>{${literal(node.props.text)}}</button>`;
      case "Input":
        return `<input aria-label={${literal(node.props.placeholder)}} placeholder={${literal(node.props.placeholder)}}${style} />`;
    }
  }
  return `import * as React from "react";\n\nexport default function ${componentName}(): React.ReactElement {\n  return (${emit(design.root)});\n}\n`;
}
export function downloadFile(
  filename: string,
  content: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
