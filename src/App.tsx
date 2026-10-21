import { useState } from "react";
import { type Design } from "./ir/schema";
import { findNode } from "./ir/edit";
import { samples } from "./ir/samples";
import { Preview } from "./components/Preview";
import { Inspector } from "./components/Inspector";
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
  const [design, setDesign] = useState(initial.design);
  const [notice, setNotice] = useState(initial.notice);
  const [selectedId, setSelectedId] = useState(initial.design.root.id);
  const [prompt, setPrompt] = useState(
    "A minimal login form for a creative workspace",
  );
  const [tab, setTab] = useState<"preview" | "json" | "react">("preview");
  const [feedback, setFeedback] = useState("");
  function commit(next: Design) {
    setDesign(next);
    try {
      const error = saveDesign(window.localStorage, next);
      if (error) setNotice(error);
    } catch {
      setNotice("Local storage is unavailable. Export your work to keep it.");
    }
  }
  function replace(next: Design) {
    commit(next);
    setSelectedId(next.root.id);
    setTab("preview");
  }
  const code = exportReact(design);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">f</span>forma
          <span className="brand-sub">DESIGN STUDIO</span>
        </a>
        <span className="phase-badge">
          <i /> LOCAL WORKSPACE · PHASE 02
        </span>
        <button className="quiet" onClick={() => replace(samples[0])}>
          Reset to sample
        </button>
        <button
          className="dark-button"
          onClick={() => {
            setTab("react");
            setFeedback("");
          }}
        >
          Export component <span>↗</span>
        </button>
      </header>
      <main className="workspace">
        <aside className="prompt-panel">
          <div className="section-label">YOUR STARTING POINT</div>
          <h1>
            Small prompt.
            <br />
            New possibilities.
          </h1>
          <p className="intro">
            Turn a starting idea into a UI you can explore, edit, and make your
            own.
          </p>
          <GenerationForm
            prompt={prompt}
            onPrompt={setPrompt}
            onDesign={replace}
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
                <span>{["↳", "◫", "▤", "✉"][index]}</span>
                {
                  [
                    "Login form",
                    "Pricing card",
                    "Dashboard header",
                    "Contact form",
                  ][index]
                }
                <span>↗</span>
              </button>
            ))}
          </div>
          <div className="local-note">
            <span className="local-dot" />
            Designs are saved in this browser.
            <small>Saved locally after each change.</small>
          </div>
        </aside>
        <section className="canvas-panel">
          <div className="canvas-toolbar">
            <div className="tabs">
              {(["preview", "json", "react"] as const).map((item) => (
                <button
                  key={item}
                  className={tab === item ? "active" : ""}
                  onClick={() => setTab(item)}
                >
                  {item === "preview"
                    ? "◫ Preview"
                    : item === "json"
                      ? "{ } JSON"
                      : "〈〉 React"}
                </button>
              ))}
            </div>
            <span className="validated">
              <i /> Validated IR <span>v1.0.0</span>
            </span>
          </div>
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
            <span>◈ IR is the source of truth</span>
            <span>5 components · Safe by design</span>
          </footer>
        </section>
        <aside className="inspector-panel">
          <div className="inspector-heading">
            Inspector<span>⚙</span>
          </div>
          <Inspector
            design={design}
            node={findNode(design.root, selectedId)}
            onCommit={commit}
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
              Download design JSON <span>↓</span>
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
