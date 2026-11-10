import { useEffect, useReducer, useRef, useState } from "react";
import { type Design } from "./ir/schema";
import { findNode } from "./ir/edit";
import { samples } from "./ir/samples";
import { Preview } from "./components/Preview";
import { Inspector } from "./components/Inspector";
import { ComponentTree } from "./components/ComponentTree";
import { StructureControls } from "./components/StructureControls";
import { createEditor, editorReducer, type Command } from "./editor/history";
import { GenerationForm } from "./components/GenerationForm";
import { generateDesign } from "./services/generator";
import { restoreDesign, saveDesign } from "./services/persistence";
import { downloadFile, exportJSON, exportReact } from "./services/export";
function initialState() {
  try {
    return restoreDesign(window.localStorage);
  } catch {
    return {
      design: samples[0],
      notice: "Local storage is unavailable. Export your work to keep it.",
    };
  }
}
export default function App() {
  const [initial] = useState(initialState);
  const [editor, dispatch] = useReducer(
    editorReducer,
    initial.design,
    createEditor,
  );
  const { design, selectedId } = editor.present;
  const [panel, setPanel] = useState<"generate" | "layers">("generate");
  const [notice, setNotice] = useState(initial.notice);
  function setSelectedId(id: string) {
    dispatch({ type: "select", id });
  }
  function command(value: Command) {
    dispatch({ type: "edit", command: value });
  }
  const [prompt, setPrompt] = useState(
    "A minimal login form for a creative workspace",
  );
  const [tab, setTab] = useState<"preview" | "json" | "react">("preview");
  const [feedback, setFeedback] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const canvasRef = useRef<HTMLElement>(null);
  function changeTab(next: "preview" | "json" | "react") {
    setTab(next);
    // The copy/download message belongs to the previous file; do not carry it over.
    setFeedback("");
  }
  // On phones the canvas is stacked below the prompt panel, so results of
  // "Generate" or "Export" would otherwise appear off-screen without feedback.
  function revealCanvas() {
    if (!window.matchMedia?.("(max-width: 560px)").matches) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    canvasRef.current?.scrollIntoView?.({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
  }
  useEffect(() => {
    if (editor.revision === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const error = saveDesign(window.localStorage, design);
        if (error) setNotice(error);
      } catch {
        setNotice("Local storage is unavailable. Export your work to keep it.");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [design, editor.revision]);
  useEffect(() => {
    function shortcuts(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input,textarea,select,[contenteditable]")
      )
        return;
      if (
        event.isComposing ||
        event.altKey ||
        !(event.ctrlKey || event.metaKey)
      )
        return;
      const key = event.key.toLowerCase();
      if (key === "z" || (key === "y" && event.ctrlKey)) {
        event.preventDefault();
        dispatch({ type: key === "y" || event.shiftKey ? "redo" : "undo" });
      }
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);
  function replace(next: Design) {
    dispatch({ type: "replace", candidate: next });
    changeTab("preview");
    setAnnouncement(`Design updated: ${next.name}.`);
    revealCanvas();
  }
  const code = exportReact(design);
  return (
    <div className="app-shell">
      <header className="topbar">
        <h1 className="sr-only">Forma design studio</h1>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <a className="brand" href="#">
          <span className="brand-mark" aria-hidden="true">
            f
          </span>
          forma
          <span className="brand-sub">DESIGN STUDIO</span>
        </a>
        <span className="phase-badge">
          <i /> LOCAL WORKSPACE
        </span>
        <div className="history-actions" aria-label="Design history">
          <button
            aria-label="Undo"
            title="Undo (Ctrl/Cmd+Z outside text fields)"
            disabled={editor.past.length === 0}
            onClick={() => dispatch({ type: "undo" })}
          >
            ↶ Undo
          </button>
          <button
            aria-label="Redo"
            title="Redo (Ctrl/Cmd+Shift+Z)"
            disabled={editor.future.length === 0}
            onClick={() => dispatch({ type: "redo" })}
          >
            ↷ Redo
          </button>
        </div>
        <button className="quiet" onClick={() => replace(samples[0])}>
          Reset to sample
        </button>
        <button
          className="dark-button"
          onClick={() => {
            changeTab("react");
            revealCanvas();
          }}
        >
          Export component <span aria-hidden="true">↗</span>
        </button>
      </header>
      <main className="workspace">
        <aside className="prompt-panel" aria-label="Generate and layers">
          <div
            className="sidebar-tabs"
            role="group"
            aria-label="Workspace panels"
          >
            <button
              aria-pressed={panel === "generate"}
              onClick={() => setPanel("generate")}
            >
              Generate
            </button>
            <button
              aria-pressed={panel === "layers"}
              onClick={() => setPanel("layers")}
            >
              Layers
            </button>
          </div>
          <div hidden={panel !== "generate"}>
            <div className="section-label">YOUR STARTING POINT</div>
            <h2 className="prompt-heading">
              Small prompt. <br />
              New possibilities.
            </h2>
            <p className="intro">
              Turn a starting idea into a UI you can explore, edit, and make
              your own.
            </p>
            <GenerationForm
              prompt={prompt}
              onPrompt={setPrompt}
              onDesign={replace}
              revision={editor.revision}
            />
            <div className="divider" />
            <div className="section-label">A LITTLE INSPIRATION</div>
            <div className="sample-list">
              {samples.map((sample, index) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setPrompt(
                      [
                        "A minimal login form",
                        "A simple pricing card",
                        "A dashboard header",
                        "A contact form",
                      ][index],
                    );
                    replace(
                      generateDesign(
                        ["login", "pricing", "dashboard", "contact"][index],
                      ),
                    );
                  }}
                >
                  <span aria-hidden="true">{["↳", "◫", "▤", "✉"][index]}</span>
                  {
                    [
                      "Login form",
                      "Pricing card",
                      "Dashboard header",
                      "Contact form",
                    ][index]
                  }
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
          <div hidden={panel !== "layers"}>
            {panel === "layers" && (
              <ComponentTree
                design={design}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCommand={command}
              />
            )}
          </div>
          <div className="local-note">
            <span className="local-dot" />
            Designs are saved in this browser.
            <small>Saved locally after each change.</small>
          </div>
        </aside>
        <section className="canvas-panel" ref={canvasRef} aria-label="Canvas">
          <div className="canvas-toolbar">
            <div className="tabs" role="group" aria-label="Canvas views">
              {(["preview", "json", "react"] as const).map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  aria-pressed={tab === item}
                  onClick={() => changeTab(item)}
                >
                  <span aria-hidden="true">
                    {item === "preview"
                      ? "◫ "
                      : item === "json"
                        ? "{ } "
                        : "〈〉 "}
                  </span>
                  {item === "preview"
                    ? "Preview"
                    : item === "json"
                      ? "JSON"
                      : "React"}
                </button>
              ))}
            </div>
            <span className="validated">
              <i /> Validated IR <span>v1.0.0</span>
            </span>
          </div>
          {editor.error && (
            <div role="alert" className="notice editor-error">
              {editor.error}
              <button
                aria-label="Dismiss editing error"
                onClick={() => dispatch({ type: "clear-error" })}
              >
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          <div className="canvas-content">
            {tab === "preview" ? (
              <>
                <div className="artboard-label">
                  <span>{design.name}</span>
                  <span>DESIGN / {design.id.toUpperCase()}</span>
                </div>
                <div className="artboard">
                  <Preview
                    design={design}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>
                <p className="canvas-hint">
                  Click an element to make it yours.
                </p>
              </>
            ) : (
              <div className="code-panel">
                <div className="code-actions">
                  <strong>
                    {tab === "json" ? "design.json" : "GeneratedDesign.tsx"}
                  </strong>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          tab === "json" ? exportJSON(design) : code,
                        );
                        setFeedback("Copied to clipboard.");
                      } catch {
                        setFeedback(
                          "Clipboard is unavailable. Use Download instead.",
                        );
                      }
                    }}
                  >
                    Copy
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        tab === "json" ? "design.json" : "GeneratedDesign.tsx",
                        tab === "json" ? exportJSON(design) : code,
                        tab === "json" ? "application/json" : "text/plain",
                      )
                    }
                  >
                    Download
                  </button>
                </div>
                <pre
                  tabIndex={0}
                  aria-label={
                    tab === "json" ? "Design JSON" : "React component"
                  }
                >
                  {tab === "json" ? exportJSON(design) : code}
                </pre>
                <p role="status">{feedback}</p>
              </div>
            )}
          </div>
          <footer className="canvas-footer">
            <span>
              <span aria-hidden="true">◈ </span>IR is the source of truth
            </span>
            <span>5 components · Safe by design</span>
          </footer>
        </section>
        <aside className="inspector-panel" aria-label="Inspector">
          <div className="inspector-heading">
            Inspector<span aria-hidden="true">⚙</span>
          </div>
          <Inspector
            design={design}
            node={findNode(design.root, selectedId)}
            revision={editor.revision}
            onEdit={(id, patch) => command({ kind: "props", id, patch })}
          />
          <StructureControls
            design={design}
            selectedId={selectedId}
            onCommand={command}
            onSelect={setSelectedId}
          />
          <div className="inspector-bottom">
            <span className="section-label">BUILT TO BE YOURS</span>
            <p>
              A validated design.
              <br />A reusable React component.
              <br />A starting point, with no lock-in.
            </p>
            <button
              onClick={() =>
                downloadFile(
                  "design.json",
                  exportJSON(design),
                  "application/json",
                )
              }
            >
              Download design JSON <span aria-hidden="true">↓</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
