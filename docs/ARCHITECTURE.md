# Architecture

## Source of truth

The only accepted design is a Zod-validated, versioned JSON IR. Templates produce candidates, never code. The optional server-side model must return the same data contract; model output must never become executable React, HTML, JavaScript, or CSS. React export is a separate trusted serializer using fixed templates.

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
- `src/components/nodeStyle.ts`: explicit per-type style mapping shared by trusted renderer and exporter.
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

Local storage is untrusted on restoration and may be unavailable. Both restoration and saving validate. Restoration falls back with a visible notice; write failures leave the in-memory design available for export. The browser storage getter is guarded separately because access itself can throw. Deterministic generation uses no credentials or provider requests. AI generation uses the server boundary below. This is not a production security certification: CSP, accessibility/security audits, telemetry policy, deployment and dependency monitoring remain Phase 4.

## Decisions and trade-offs

- Preserve the suggested stack: Vite, React 18.3.1, strict TypeScript 5.6.3, Zod 3.23.8, Vitest, Testing Library, ESLint, Prettier, plain CSS. No UI framework; the Phase 2 server uses native Node HTTP without a framework.
- The initial PATH runtime was Node 16.17.0 / npm 8.15.0. An initial compatible toolchain installed and ran tests but had audit advisories. A second installed runtime, Node 24.19.0, was discovered and used for the final implementation. Require Node 24.x and pin current Vite/Vitest/ESLint releases in the lockfile. This revises the runtime choice, not the application stack. Older React/Zod major versions keep this small contract readable and meet the requested stack.
- Phase 1 skipped its optional LLM path. Phase 2 adds exactly one OpenAI adapter; four deterministic templates remain available independently.
- No global state library: a single accepted design and selected node ID are sufficient. Validate every update instead of introducing mutable partial state.
- Render wrappers support click/keyboard selection; exported components omit wrappers and editor affordances. Runtime and exports share explicit style mapping so they stay visually consistent.
- Inspector updates apply on blur/Enter; drafts may be invalid without affecting the design. An invalid draft remains visible until corrected or selection changes.
- Shared runtime validation is intentionally repeated at boundaries for clarity over micro-optimization. This is inexpensive under the 200-node cap.
- Only local persistence, one design, no import UI. Generation/reset intentionally replaces current work; export provides a portable copy.

## Adding a component safely

1. Add a strict per-type props object and discriminant to the recursive schema/type union. Define bounds and container/leaf behavior.
2. Add explicit style mappings, then a registry component with only fixed DOM props and inert text rendering.
3. Add a fixed TSX export branch; put values exclusively into escaped expression literals. Never produce identifiers or tags from data.
4. Add valid/invalid fixtures and schema, renderer, editor, persistence and compiler tests. Add appropriate inspector controls, factory defaults and structural/history compatibility tests deliberately.
5. Change the schema version/migration if the contract is incompatible. Run all quality gates before changing the roadmap status.

## Phase 2 server design and threat model

Only one provider adapter, OpenAI, is permitted. The Node server will use the official SDK Responses API with `text.format: { type: "json_object" }`, `store: false`, disabled SDK retries and disabled SDK logging. The adapter pins the official OpenAI API base URL so an ambient base-URL variable cannot redirect credentials. `LLM_MODEL` must be explicitly configured; there is no default model ID. JSON mode is chosen deliberately: although provider Structured Outputs supports recursion, it cannot enforce our custom RGB refinement, unique IDs, total node count, and depth invariants, and strict schemas require optional fields to be represented differently. Full Zod validation remains the only acceptance authority. Model JSON will never execute. Settings and usage metadata will be recorded without raw content. Temperature 0.2 will be sent only when explicitly enabled for a model that supports it, otherwise omitted; this avoids guessing capabilities from arbitrary model IDs.

Official documentation checked on **2026-10-21**, before implementing the adapter:

- [Official TypeScript/JavaScript SDK](https://developers.openai.com/api/reference/typescript): Responses API, AbortSignal, retry/timeout controls, logging controls.
- [Structured Outputs and JSON mode](https://developers.openai.com/api/docs/guides/structured-outputs): supported schema subset, recursion, required fields and `text.format` JSON mode.
- [Model catalog](https://developers.openai.com/api/docs/models): identifiers/capabilities must be chosen by the operator and supplied through `LLM_MODEL`; account availability is not assumed.

Threats and controls:

- **Secret exposure**: credentials are read only by server configuration. No VITE-prefixed secrets, config endpoints, raw provider errors or SDK logs. Capabilities returns only a boolean. A canary-secret client-build test will verify bundle isolation. Configuration and keys must never be imported by browser modules.
- **Untrusted prompts / prompt injection**: bounded text is encoded inside a separately delimited user message. System rules and repair messages explicitly treat user/output text as data. Delimiters reduce ambiguity but do not prevent prompt injection. The guarantee is schema validation plus the fixed renderer/exporter, not model obedience.
- **Untrusted model output**: bound output bytes, strip at most one whole markdown fence, parse JSON, then use the unchanged validator. Reject invalid output; never render partial output. Bounded repair includes size-limited serialized error details and invalid-output text; no code evaluation or automatic ID canonicalization.
- **Cost/abuse**: loopback-only Node HTTP server, no CORS, Host/Origin checks, JSON-only POST, request-byte/prompt/output-token limits, whole-generation deadline, one concurrent generation and a global in-memory request window. Repairs default to 1 and hard-cap at 2, SDK retries 0. These are local development controls, not authentication, distributed quotas, provider billing limits, or production rate limiting. Cancellation aborts upstream work best-effort; already consumed tokens can still be charged.
- **Logs/data retention**: logs contain only attempts, latency and error kind. No prompts, outputs, API keys, provider exception details or request bodies. `store:false` is requested; this is not a claim of zero provider retention. Live eval result files are git-ignored and store IDs, metrics and error codes, not raw prompts/outputs; operators must still review local files before sharing.

Data flow: mode → deterministic generator OR same-origin `/api/generate` → server prompt/catalog → provider interface → bounded parse/validate/repair → validated final result → client revalidation → existing state/persistence/renderer/exporter. Schema/catalog/sample modules stay platform-neutral; React style mapping lives outside `src/ir` with minimal import changes. `npm run dev` supervises server and Vite together, with a fixed loopback proxy. Progress-only SSE is optional and will be assessed last; no partial design acceptance is permitted.

## Phase 2 implementation modules and decisions

- `server/config.ts`: environment-only secrets/model/limits; strict numeric bounds. `.env` loads only in Node entry points. API starts without a key; a key without a model fails startup explicitly.
- `server/provider.ts`, `server/openai.ts`: narrow `IRProvider.generateIR` contract and the only concrete provider adapter. SDK response text is always untrusted. Usage is accumulated across attempts.
- `server/prompt.ts`: converts the actual exported Zod design schema to JSON Schema at request time, combines its props/ranges with the same depth/count constants and validated samples. Color refinement documentation lives on the actual color schema. Tests assert catalog equality and that added component/prop schemas change the generated prompt.
- `server/pipeline.ts`: whole-generation deadline/abort race (even a provider ignoring signals cannot hang the caller), strict single-object JSON parser with one optional whole fence, validation, and bounded repair (default 1, cap 2). Non-JSON is repairable; provider failures/timeouts are not retried. Final results use the original path/code/message error contract, capped at 50 reported errors (paths 256 characters, messages 512 characters) to bound response amplification; the validator itself is unchanged. No ID rewriting.
- `server/api.ts`: testable Web Request/Response handler. Strict `{prompt}` body, actual-byte limit, Host/Origin checks, fixed window counter, single active generation and metadata-only logs. Rate window is global because all supported traffic is local; no misleading per-user authentication model.
- `server/index.ts`: native Node HTTP bridge, bounded transport body, request/header read deadlines, loopback listener and disconnect cancellation. No dependency on React/DOM code. `src/ir` remains platform-neutral; CSS mapping moved to `src/components/nodeStyle.ts` without schema/IR version changes.
- `scripts/dev.mjs`, `vite.config.ts`: supervise both processes and proxy `/api`, using the same `API_PORT`. Client port is fixed at 5173 with strict-port checking so allowed origins do not drift.
- `src/services/ai.ts`, `src/components/GenerationForm.tsx`: capability/mode/loading/cancel controls, response-envelope checks and defense-in-depth IR validation. Late cancelled responses cannot commit. Accepted designs enter the existing App update/persistence path; errors do not replace them.
- `evals/`: validated 30-case corpus, fixture/live runners, structural grading, deterministic baseline and tested metric math. See EVALS.md for denominators, partial usage, optional pricing and results.

The SDK requires a compatible Zod peer; Zod was updated within major 3 to 3.25.76. No validator rule was relaxed and all Phase 1 tests remain unchanged. Exact package versions are locked. The Node 24 runtime requirement is unchanged.

SSE was assessed after the non-streaming pipeline/tests/offline eval passed and intentionally skipped: another response transport and disconnect parser would add complexity without improving IR acceptance or unverified live quality. The UI provides loading/cancel, and only complete validated IR is accepted. Progress streaming remains explicitly deferred; no partial output is rendered. Live generation/quality and real-provider compatibility remain unverified without credentials, so Phase 2's live-quality exit criterion remains open.

## Phase 3 implementation plan (2026-10-28)

Preserve the existing five-component v1 IR, single provider, API/proxy and all prior tests. Add pure insert/remove/move operations that reject root deletion/movement, missing targets, leaf destinations, cyclic nesting, invalid indices and all schema/resource violations. A pure editor reducer will validate commits and keep bounded in-memory snapshots; selection is shared by tree, preview and inspector. Generation/reset will be undoable; current IR alone remains persisted/exported. No history serialization or IR migration is necessary.

Build a collapsible keyboard-navigable hierarchy with explicit sibling/parent/child relationships. Native tree-row drag/drop will carry only an internal node ID and commit through the same move operation as accessible move controls. External drag payloads must never be parsed as IR or HTML. Inspector controls will cover all existing props, including optional colors and Stack configuration. Invalid drafts and operations remain outside accepted state.

AI review uses the official SDK, error-codes and Responses documentation checked on 2026-10-28. Add safe classifications for provider authentication/model/configuration/rate/quota/connection failures, incomplete outputs and refusals; preserve the single deadline, zero SDK retries and bounded validation repairs. Workspace changes must abort pending generation and prevent late results replacing user edits. No credentials or model are configured in this session, so live compatibility/quality cannot be certified.

### Security-driven validator upgrade

The Phase 3 audit on 2026-10-28 reported [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), affecting the prior Zod dependency. Upgrade to Zod 4.6.7 uses the patched native v4 implementation; it does not hide v3 behind a compatibility import. The [upstream fix](https://github.com/colinhacks/zod/commit/a0ebf97) checks constrained collection sizes before walking elements. IR v1, every allowlist/strict props rule, and structural preflight remain unchanged. Normalize Zod 4 literal/enum/discriminator diagnostics to the existing public error codes so persistence, client errors and eval metrics retain their contract.

Replace the obsolete third-party converter with Zod's [native JSON Schema export](https://zod.dev/json-schema), targeting draft 7. One existing catalog test uses the native helper instead of the removed converter; its equality/catalog/new-prop assertions are retained. All prior test cases remain. Use `partialRecord` for the eval corpus's sparse type-count expectations, preserving its original semantics. This dependency migration is required by the security gate, not an expansion of editor scope. The historical Phase 2 version descriptions above record that phase's original implementation.

## Phase 3 editor implementation

- `src/ir/structure.ts`: platform-neutral lookup and immutable insert/remove/move operations. Validate the starting design and final candidate. Destination indices refer to the final list after removing the source. IDs survive moves; factory IDs deterministically choose the first free `node-N` in the current design. The single root is protected; only Card/Stack accept children; self/descendant parenting and schema/resource violations are rejected atomically.
- `src/editor/history.ts`: pure reducer owning accepted IR and selected ID, plus past/future snapshots, monotonic revision and operation errors. Every accepted design is validated, including undo/redo destinations. Selection/no-ops/rejections do not create history; new edits clear redo. Combined history is capped at 40 snapshots and 4 MiB of serialized UTF-8 data; retain nearest states first. Current design/JS object overhead is outside that byte accounting. History is not persisted; only current IR crosses the existing localStorage boundary. Generated replacements and reset are undoable.
- `src/components/ComponentTree.tsx`: ARIA tree/group/treeitem hierarchy, roving selected focus, arrows/Home/End, disclosure and selection reveal. Labels are inert text. Native drag state contains only a validated local source ID; `dataTransfer.getData` is never called. Targets do not shift row geometry and show allowed/blocked feedback. Invalid or external drops cannot introduce data/code. Move previews and commits call the same pure move validator as the controls. Tree disclosure is panel-local UI state, not IR/history.
- `src/components/StructureControls.tsx`: add/remove, sibling moves, permitted-parent selection and related-node navigation. Dropdown destinations exclude the source subtree, while the operation layer independently rechecks every move. Removing a subtree selects its surviving parent; history restores selection as well as design.
- `src/components/Inspector.tsx`: all existing props/configurations and optional colors. Draft/error state is keyed to accepted value and editor revision, so history changes clear stale drafts without remounting focused fields. Validate a patch for inline feedback, then dispatch it rather than an entire stale design; the reducer applies the same pure update against its latest state and validates again.
- `src/App.tsx`: coordinates reducer, preview/tree/inspector, history buttons and shortcuts. Ignore shortcuts in input/textarea/select/contenteditable and during IME composition. Persist accepted current IR after commit, using a cancellable microtask to skip stale/unmounted writes. Studio panes scroll independently on desktop; no generated breakpoint model is introduced.
- `src/components/GenerationForm.tsx`, `src/services/ai.ts`: a design revision change aborts the active generation. An abort race settles the client even if a transport ignores its signal; late results cannot commit. Merely selecting a node does not cancel generation. Accepted mutations do, while invalid drafts do not.

### Provider review and remaining live checks

Official [SDK cancellation/retry documentation](https://developers.openai.com/api/reference/typescript) and [error guidance](https://developers.openai.com/api/docs/guides/error-codes) were rechecked on 2026-10-28. Preserve JSON-only output, shared validation, fixed OpenAI origin, explicit environment model, zero SDK retries and one generation deadline. Adapter diagnostics classify known status/name/code fields into fixed application messages; raw exception/refusal text is never forwarded or logged. Quota errors do not suggest blind retries; model/configuration errors suggest server settings; upstream 429 maps to rate_limited/HTTP 429; provider timeout maps to timeout. Refused, failed or explicitly incomplete Responses results stop before repair. Malformed complete output still crosses bounded validation/repair. Tests cover these contracts without credentials.

No key or model is configured, so real-model access, JSON-mode support, temperature compatibility, refusals, costs and latency remain live checks. The adapter and schema-derived prompt strategy remain single-provider; no model default or new generation mode was invented.

### Editing security and limitations

New attack/resource surfaces are structural edits, drop payloads and retained history. All accepted operations use the same strict v1 schema, unique IDs, bounded styles/text and structural limits. The editor never executes export output, imports dropped markup, or introduces arbitrary DOM props. Internal drag IDs are references only; external navigation drops are prevented and payloads ignored. Root/cycle/leaf checks complement final validation rather than replacing it. History cannot reinstate invalid IR and is bounded, but retains removed content in memory until pruned/reload; it is not encrypted or secure deletion. Reset is intentionally reversible.

No new components, breakpoint variants, multi-select, cross-document drag, persistent history, authentication or collaboration are implemented. Native event tests prove move decisions and rejection; browser smoke verified keyboard moves/reparenting and history, while a reliable end-to-end native pointer-drop completion, touch dragging and assistive-technology audits remain unverified. Production CSP, accessibility/security review, performance budgets and deployment are Phase 4 work.
