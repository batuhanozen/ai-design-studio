# Repository guidance

## Setup and checks
- Runtime: Node >=16.17; npm >=8.15. Use `npm ci` to install.
- Start: `npm run dev`.
- Required gates: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.
- Format: `npm run format`.

## Conventions
Use English for code, comments, documentation, commits, and reports. Use strict TypeScript, React function components, plain CSS, small modules, and pure immutable editing functions. Test behavior and security boundaries. Never weaken validation, skip tests, or disable lint rules to pass checks.

## Architecture
Versioned, validated JSON IR is the single source of truth. Generators produce IR candidates only, never executable code or markup. Validate before storage, rendering, editing, restoration, and export. Per-component props must be strict and allowlisted. Enforce bounded styles, text, depth, node count, and unique IDs. Only containers have children. Never evaluate IR or spread arbitrary props/styles onto DOM elements. Use explicit renderer mappings and fixed export templates. Keep secrets out of the browser. Unknown render types produce inert placeholders. Invalid edits never replace the accepted design.

Implement only Phase 1 in docs/ROADMAP.md. Authentication, collaboration, billing, databases, providers, plugins, uploads, animations, breakpoints, undo/redo, and drag/drop are outside this phase. Mark roadmap work implemented only after verification. Run all required gates before claiming success.
