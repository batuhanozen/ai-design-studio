import { useEffect, useRef, useState } from "react";
import type { Design } from "../ir/schema";
import { generateDesign } from "../services/generator";
import { AIError, getCapabilities, requestDesign } from "../services/ai";
export function GenerationForm({
  prompt,
  onPrompt,
  onDesign,
}: {
  prompt: string;
  onPrompt: (prompt: string) => void;
  onDesign: (design: Design) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [capabilityMessage, setCapabilityMessage] = useState(
    "Checking local AI server…",
  );
  const [mode, setMode] = useState<"samples" | "ai">("samples");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    getCapabilities(controller.signal)
      .then((value) => {
        setEnabled(value);
        setCapabilityMessage(
          value
            ? "AI sends your prompt to OpenAI through the local server."
            : "AI is disabled. Set OPENAI_API_KEY and LLM_MODEL on the server.",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCapabilityMessage(
            "AI server unavailable. Deterministic samples still work.",
          );
      });
    return () => {
      controller.abort();
      active.current?.abort();
    };
  }, []);
  async function generate() {
    setError("");
    if (mode === "samples") {
      onDesign(generateDesign(prompt));
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    try {
      const design = await requestDesign(prompt, controller.signal);
      if (!controller.signal.aborted && active.current === controller)
        onDesign(design);
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(
          caught instanceof AIError
            ? `${caught.kind}: ${caught.message}`
            : "The server could not complete generation. Your current design was kept.",
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setLoading(false);
      }
    }
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    setLoading(false);
    setError("Generation cancelled. Your current design was kept.");
  }
  return (
    <>
      <fieldset className="generation-mode" disabled={loading}>
        <legend>Generation mode</legend>
        <label>
          <input
            type="radio"
            name="generation-mode"
            value="samples"
            checked={mode === "samples"}
            onChange={() => setMode("samples")}
          />
          Deterministic samples
        </label>
        <label>
          <input
            type="radio"
            name="generation-mode"
            value="ai"
            checked={mode === "ai"}
            disabled={!enabled}
            onChange={() => setMode("ai")}
          />
          AI (server)
        </label>
      </fieldset>
      <p className="capability-note">{capabilityMessage}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) void generate();
        }}
      >
        <label className="prompt-label" htmlFor="prompt">
          Describe your interface
        </label>
        <textarea
          id="prompt"
          maxLength={4000}
          value={prompt}
          disabled={loading}
          onChange={(event) => onPrompt(event.target.value)}
        />
        <button className="generate" type="submit" disabled={loading}>
          {loading
            ? "Generating…"
            : mode === "samples"
              ? "Generate sample"
              : "Generate with AI"}
          <span>↗</span>
        </button>
        {loading && (
          <button type="button" className="cancel-generation" onClick={cancel}>
            Cancel generation
          </button>
        )}
      </form>
      <p className="generator-note">
        <span>◈</span>
        {mode === "samples"
          ? "Deterministic sample generator. No AI call or API key needed."
          : "AI generates JSON only. Every result is validated before it replaces your design."}
      </p>
      {error && (
        <div className="generation-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
