# Architecture

## Source of truth

The only accepted design is a Zod-validated, versioned JSON IR. Templates produce candidates, never code. A future model must return the same data contract; model output must never become executable React, HTML, JavaScript, or CSS. React export is a separate trusted serializer using fixed templates.

```text
prompt → deterministic generator → IR candidate → validate
                                                    ├─ errors → reject / show paths
                                                    └─ accepted design → state → preview
                                                                          ├─ inspector patch → validate → state
                                                                          ├─ localStorage → migrate → validate → restore
                                                                          └─ validate → JSON / fixed-template TSX export
```

## Modules

- `src/ir/schema.ts`: recursive discriminated union, strict component props, preflight structural limits, typed results, formatting, v1 migration boundary.
- `src/ir/samples.ts`: four representative valid designs and invalid fixtures.
- `src/ir/edit.ts`: node lookup and pure immutable updates with revalidation.
- `src/ir/styles.ts`: explicit per-type style mapping shared by trusted renderer and exporter.
- `src/components/Preview.tsx`: allowlisted registry, inert rejection placeholder, selection wrappers and keyboard selection controls.
- `src/components/Inspector.tsx`: local field drafts, validation errors, accepted edits only.
- `src/services/`: deterministic generation, versioned persistence, controlled exports and browser downloads.
- `src/App.tsx`: studio state and orchestration. `src/styles.css`: studio chrome only.
- Colocated tests: schema invariants, generator, edits, persistence, hostile rendering, user flow and TSX compiler checks.

## Contract and security boundaries

Schema version is literally `1.0.0`. `migrateDesign` currently validates v1; all other versions are rejected. Future migrations must explicitly translate older versions and revalidate. Nodes have stable template IDs; editing preserves them. IDs use a bounded ASCII format and must be unique within a design.

Only Stack/Card contain children. Maximum tree depth is 12 (root depth 1), maximum nodes 200, text/placeholder length 2,000, name 100, spacing 0–96 or a fixed token, and text size 10–72. The bounded preflight runs before recursive schema parsing, rejects cycles/shared nodes and prevents unbounded traversal of malformed child arrays. Schema parsing returns a cloned validated tree.

All object schemas reject unknown properties. Colors accept exact design tokens, 3/6/8-digit hex, or integer RGB channels 0–255. URLs, raw CSS, class names, HTML props and behavior strings have no schema positions. Ordinary text can contain HTML-like strings and URLs: it stays inert React text, including during code export. There are no arbitrary style spreads, event handlers from IR, dynamic imports from IR, or evaluation mechanisms. Preview selection handlers are fixed studio code. Invalid nodes render an inert visible placeholder; their unknown props never reach the DOM.

TSX export validates the entire design, maps each node to fixed tags and explicit style values, and puts user text only in JSON-serialized expression literals. HTML-significant characters and Unicode line separators are escaped. No IR value enters a code identifier position. The optional component-name argument accepts only an uppercase ASCII letter followed by letters/digits, at most 64 characters; lowercase reserved keywords and punctuation are rejected. Each sample plus hostile text is type-checked with the TypeScript compiler in tests. Same design and component name produce byte-identical output. Exported buttons have `type="button"` and no behavior.

Local storage is untrusted on restoration and may be unavailable. Both restoration and saving validate. Restoration falls back with a visible notice; write failures leave the in-memory design available for export. The browser storage getter is guarded separately because access itself can throw. No credentials or networking are used by the app. This is not a production security certification: CSP, accessibility/security audits, telemetry policy, deployment and dependency monitoring remain Phase 4.

## Decisions and trade-offs

- Preserve the suggested stack: Vite, React 18.3.1, strict TypeScript 5.6.3, Zod 3.23.8, Vitest, Testing Library, ESLint, Prettier, plain CSS. No UI framework or server.
- The initial PATH runtime was Node 16.17.0 / npm 8.15.0. An initial compatible toolchain installed and ran tests but had audit advisories. A second installed runtime, Node 24.19.0, was discovered and used for the final implementation. Require Node 24.x and pin current Vite/Vitest/ESLint releases in the lockfile. This revises the runtime choice, not the application stack. Older React/Zod major versions keep this small contract readable and meet the requested stack.
- Skip the optional LLM path entirely. Adding a server, provider keys and model-output repair is Phase 2. Four templates prove the data flow without claiming model capability.
- No global state library: a single accepted design and selected node ID are sufficient. Validate every update instead of introducing mutable partial state.
- Render wrappers support click/keyboard selection; exported components omit wrappers and editor affordances. Runtime and exports share explicit style mapping so they stay visually consistent.
- Inspector updates apply on blur/Enter; drafts may be invalid without affecting the design. An invalid draft remains visible until corrected or selection changes.
- Shared runtime validation is intentionally repeated at boundaries for clarity over micro-optimization. This is inexpensive under the 200-node cap.
- Only local persistence, one design, no import UI. Generation/reset intentionally replaces current work; export provides a portable copy.

## Adding a component safely

1. Add a strict per-type props object and discriminant to the recursive schema/type union. Define bounds and container/leaf behavior.
2. Add explicit style mappings, then a registry component with only fixed DOM props and inert text rendering.
3. Add a fixed TSX export branch; put values exclusively into escaped expression literals. Never produce identifiers or tags from data.
4. Add valid/invalid fixtures and schema, renderer, editor, persistence and compiler tests. Extend inspector field allowlists deliberately.
5. Change the schema version/migration if the contract is incompatible. Run all quality gates before changing the roadmap status.
