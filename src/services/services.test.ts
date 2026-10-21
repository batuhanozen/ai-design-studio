import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { samples } from "../ir/samples";
import { requireDesign, validateDesign } from "../ir/schema";
import { findNode, updateNodeProps } from "../ir/edit";
import { generateDesign } from "./generator";
import { restoreDesign, saveDesign, STORAGE_KEY } from "./persistence";
import { exportJSON, exportReact } from "./export";
const hostile =
  'Quotes " braces {} backticks ` ${alert(1)} </script><img src=x onerror=alert(1)> & \u2028';
describe("generation and editing", () => {
  it("is deterministic and valid across template keywords and arbitrary prompts", () => {
    for (const prompt of [
      "",
      "LOGIN",
      "Pricing plan",
      "dashboard header",
      "contact message",
      hostile,
      ...Array.from({ length: 50 }, (_, i) => `idea-${i}`),
    ]) {
      expect(generateDesign(prompt)).toEqual(generateDesign(prompt));
      expect(validateDesign(generateDesign(prompt)).ok).toBe(true);
    }
    expect(generateDesign("pricing").id).toBe("pricing");
    expect(generateDesign("dashboard").id).toBe("dashboard");
    expect(generateDesign("contact").id).toBe("contact");
  });
  it("immutably updates the requested node and preserves valid structure", () => {
    const before = JSON.stringify(samples[0]);
    const result = updateNodeProps(samples[0], "login-title", {
      text: "Updated",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(findNode(result.design.root, "login-title")?.props).toHaveProperty(
        "text",
        "Updated",
      );
      expect(findNode(result.design.root, "login-subtitle")).toEqual(
        findNode(samples[0].root, "login-subtitle"),
      );
      expect(result.design.root).not.toBe(samples[0].root);
      expect(validateDesign(result.design).ok).toBe(true);
    }
    expect(JSON.stringify(samples[0])).toBe(before);
  });
  it("rejects invalid updates, unknown nodes and unknown props", () => {
    expect(
      updateNodeProps(samples[0], "login-title", { color: "url(evil)" }).ok,
    ).toBe(false);
    expect(
      updateNodeProps(samples[0], "login-title", { onClick: "alert(1)" }).ok,
    ).toBe(false);
    expect(updateNodeProps(samples[0], "missing", {}).ok).toBe(false);
  });
});
describe("persistence", () => {
  it("round trips and handles an empty store", () => {
    expect(restoreDesign(localStorage).notice).toBe("");
    expect(saveDesign(localStorage, samples[1])).toBe("");
    expect(restoreDesign(localStorage)).toEqual({
      design: samples[1],
      notice: "",
    });
  });
  it.each([
    "{broken",
    JSON.stringify({ ...samples[0], schemaVersion: "2.0.0" }),
    JSON.stringify({ wrong: true }),
  ])("falls back visibly from %s", (raw) => {
    localStorage.setItem(STORAGE_KEY, raw);
    const result = restoreDesign(localStorage);
    expect(result.design).toEqual(samples[0]);
    expect(result.notice).toContain("could not be restored");
  });
  it("handles blocked storage and quota failures", () => {
    const storage = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("quota");
      },
    };
    expect(restoreDesign(storage).notice).toBeTruthy();
    expect(saveDesign(storage, samples[0])).toContain("could not be saved");
  });
});
describe("controlled exports", () => {
  it("round trips JSON and refuses invalid IR", () => {
    expect(validateDesign(JSON.parse(exportJSON(samples[0]))).ok).toBe(true);
    const invalid = { ...samples[0], schemaVersion: "9.0.0" };
    expect(() => exportJSON(invalid as (typeof samples)[0])).toThrow();
    expect(() => exportReact(invalid as (typeof samples)[0])).toThrow();
  });
  it("rejects unsafe identifiers", () => {
    for (const name of [
      "a;alert(1)",
      "default",
      "123Name",
      "X{}",
      "A-B",
      "A_B",
      "",
    ])
      expect(() => exportReact(samples[0], name)).toThrow();
  });
  it("escapes hostile strings, stays deterministic, and type-checks every generated template", () => {
    const edit = updateNodeProps(samples[0], "login-title", { text: hostile });
    if (!edit.ok) throw new Error("Fixture edit failed");
    const designs = [...samples, requireDesign(edit.design)];
    const directory = mkdtempSync(join(process.cwd(), ".export-test-"));
    try {
      const files = designs.map((design, i) => {
        const code = exportReact(design);
        expect(code).toBe(exportReact(design));
        expect(code).not.toContain("</script>");
        const file = join(directory, `Generated${i}.tsx`);
        writeFileSync(file, code);
        return file;
      });
      const program = ts.createProgram(files, {
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        types: ["react"],
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(
        diagnostics.map((d) =>
          ts.flattenDiagnosticMessageText(d.messageText, "\n"),
        ),
      ).toEqual([]);
      expect(exportReact(edit.design)).toContain("\\u003c/script\\u003e");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
