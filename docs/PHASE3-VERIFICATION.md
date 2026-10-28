# Phase 3 engineering verification

Verified locally on 2026-10-28 (Europe/Berlin). This report distinguishes implementation, deterministic tests, browser observations and unverified live/production behavior.

## 1. Initial repository state

Started on `main` at `83d5b3c` with a clean working tree. The repository contained the committed Phase 1/2 React/Vite/strict TypeScript application, v1 Zod IR, native Node API, single OpenAI adapter, proxy/supervisor, four samples, nine test files, thirty-case eval corpus, CI workflow and architecture/verification documents. No tree/structural editor or history existed. The inspector edited only text/colors/spacing. The earlier AGENTS.md excluded Phase 3 work; the explicit new request authorized it, and the guidance was updated before implementation.

Inspected tracked/source structure, branch/status/log, architecture, PHASE2-VERIFICATION.md, EVALS.md, roadmap, frontend, IR/editor boundaries, provider/config/API/proxy, SDK mocks, evaluation math/corpus and existing tests. Default shell: Node 16.17.0/npm 8.15.0. Selected installed Node **24.22.1** for every npm verification using:

```sh
export PATH="/Users/Apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export npm_config_cache=/tmp/ai-design-studio-npm-cache
```

Before modification, `npm test` passed all **66 tests in 9 files**. A presence-only check found no key/model and no .env file. No credential values were printed and no live provider requests were made.

## 2. Architecture assessment and decisions

The existing IR boundary was suitable: recursive strict props, unique IDs, depth/count/text/style bounds, inert allowlisted rendering and controlled exports. Server/provider modules were separate from browser imports, while generation and restoration already crossed the shared validator. Preserve those boundaries and the same five-component v1 contract.

Add pure structural operations and a pure editor reducer rather than a new state library. The reducer owns accepted design/selection/history; all UI edits dispatch commands against its current state. Validate candidates and restored history before acceptance. Keep history transient and persist/export only the accepted design. Native tree drag/drop avoids a large library and uses the exact same move validation as accessible controls. Inspector drafts remain separate from accepted IR; revision-aware display preserves focus and clears stale drafts after history changes.

The required audit discovered a high-severity Zod advisory. A compatible patch did not exist in the prior major, so migrate to patched **Zod 4.6.7**, use its native JSON Schema exporter and remove zod-to-json-schema. No IR rule, limit, component or version was relaxed. Public literal/enum/discriminator error codes are normalized to the existing contract. One old catalog test changes its converter helper call to the native API; its equality/catalog/new-prop assertions remain. Every original test case is retained. The eval corpus's sparse count record uses partialRecord to preserve semantics. The dependency justification and primary references are in ARCHITECTURE.md. No editor dependency was added.

## 3. Implemented Phase 3 features

- Generate/Layers panels; a collapsible ARIA tree with component/content labels, hierarchy, shared preview/inspector selection, visible-row arrows/Home/End, parent/child navigation and selected-descendant reveal.
- Full editing of the existing props: text/placeholder, colors, optional colors, spacing, Text size/weight, Stack direction/align/justify. Dropdowns commit immediately; text/numeric drafts commit on Enter/blur. Invalid drafts show inline path/code errors; inputs retain focus after acceptance.
- Add any of the five supported types, remove a subtree, reorder siblings, and reparent to permitted containers. Root protection, leaf rejection, cycle rejection, ID uniqueness and all schema/resource limits are enforced before commit. New IDs are deterministic within the current document; moves preserve IDs.
- Bounded undo/redo for properties, add/remove/move/reparent, generated replacement and reset. Selection is restored with snapshots; new edits clear redo; selection/rejections/no-ops do not add history. Shared bounds: 40 snapshots and 4 MiB serialized UTF-8 payload, dropping farthest states first. This is not a measurement of total JS heap. Shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z, Ctrl+Y; editable fields and IME composition are excluded.
- Native tree drag/drop handlers with stationary before/inside/after targets, allowed/blocked indicators and structured rejection. Drag IDs come from local validated rows; external payloads are never read or parsed. Keyboard/button moves and parent selection are equivalent alternatives. Event-tested; reliable end-to-end native pointer completion remains unverified.
- Provider review: fixed safe authentication/model/configuration/quota/rate/connection/unavailable/timeout messages, HTTP 429 for upstream throttling, explicit refusal/incomplete/failed-response rejection. Existing JSON mode, shared validation, repair cap, deadline, fixed provider origin, zero SDK retries and metadata-only logging remain.
- Accepted workspace changes abort pending generation. Client abort settles even if a transport ignores its signal, and late responses cannot overwrite edits. Selection alone does not cancel. Existing AI/sample behavior and client revalidation remain.

## 4. Files added, modified and removed

Added:

- `src/ir/structure.ts`, `src/ir/structure.test.ts`: immutable structural operations, deterministic defaults and limits/rejection tests.
- `src/editor/history.ts`, `src/editor/history.test.ts`: validated reducer, history bounds/branching/selection tests.
- `src/components/ComponentTree.tsx`, `src/components/StructureControls.tsx`, `src/components/workspace.test.tsx`: hierarchy, drag/drop, accessible operations and integrated workspace tests.
- `server/provider-errors.test.ts`, `server/adapter-recovery.test.ts`: safe classifications and SDK-result recovery boundaries.
- `docs/PHASE3-VERIFICATION.md`: this report.

Modified:

- `src/App.tsx`, `src/components/Inspector.tsx`, `src/components/GenerationForm.tsx`, `src/services/ai.ts`, `src/styles.css`: editor integration, all props, cancellation, focus, panels and layout.
- `src/ir/schema.ts`, `server/prompt.ts`, `evals/corpus.ts`, `server/server.test.ts`, `package.json`, `package-lock.json`: security upgrade, native schema conversion and retained diagnostic/eval contracts.
- `server/provider.ts`, `server/openai.ts`, `server/pipeline.ts`, `server/api.ts`: typed safe provider failures and HTTP classification.
- `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`: authorized scope, usage, decisions and honest status.

No repository files were removed. The obsolete schema-converter dependency was removed. No secrets, dist files, live results or temporary artifacts were committed. Renderer/style mapper/exporter/persistence source and the remaining original test files were unchanged.

## 5. Test and verification results

All final gates below were run after a clean installation and exited 0:

| Exact command            | Result                                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --engine-strict` | Clean installation: 302 packages, audited 303; engines compatible.                                                                                                      |
| `npm run build`          | TypeScript + production client build passed; 125 modules, JS 263.34 kB / 81.99 kB gzip, CSS 13.30 kB / 3.63 kB gzip. These are build sizes, not performance benchmarks. |
| `npm run lint`           | Zero errors or warnings; no disabled rules.                                                                                                                             |
| `npm run typecheck`      | Strict typecheck passed.                                                                                                                                                |
| `npm test`               | **96 passed in 14 files**, no skipped tests: all 66 existing cases retained plus 30 new cases.                                                                          |
| `npm run format:check`   | All files matched formatting.                                                                                                                                           |
| `npm run eval:offline`   | All 30 prescribed mock outcomes matched; deterministic summary unchanged.                                                                                               |
| `npm audit`              | Zero reported vulnerabilities after patching Zod.                                                                                                                       |
| `git diff --check`       | No whitespace errors.                                                                                                                                                   |

`npm run format` was run before the gates. A clean offline install initially failed because a yocto-queue tarball was not cached; the network-enabled clean install above succeeded. Intermediate syntax, locator, typing and formatting failures were corrected before the final run; no check was skipped or weakened. The schema catalog helper substitution was the only change to an existing test file, and no original assertion was removed.

Incremental checks: baseline 66 tests; AI review/server tests passed; structural/history focused suite passed 9 tests; integrated workspace suite passed 6 tests; final complete suite passed 96 tests. New coverage includes valid/invalid operations, immutability, cycles/root/leaf/ID/resource boundaries, deterministic history, combined entry/byte limits, branch invalidation, invalid historical states, selection/collapse/keyboard behavior, all property configurations, optional clearing, focus retention, native drag events/visual indicators/external drops, shortcuts, generation replacement, AI-shaped design editing, abort and late-result recovery.

Offline eval remains synthetic: 5/30 first-attempt valid, 10/30 final valid, 5/15 successful repairs, 1.5 average attempts, virtual latency p50/p95 5/10 ms, mock usage 3,500 input / 700 output tokens, structural passes 8/30. Deterministic baseline: 30/30 valid, 18/30 structural passes. Intentional failures: 10 invalid outputs, 5 timeouts, 5 provider errors. No expectations were lowered and no schema was tuned to inflate scores.

### Browser observations

Started API/Vite with `npm run dev`, then restarted both after the dependency upgrade. In the actual browser, verified dashboard generation in sample mode, Layers selection, Stack direction editing, Text insertion/text editing, sibling movement, reparenting through Parent container, removal, undo/redo and keyboard expand/collapse. Reload restored the edited design while history returned to empty. An invalid javascript color produced `root.children[4].props.color` inline and left accepted IR intact; correcting to accent and undoing/redoing updated the JSON view to the expected v1 node/text/color. This checks real UI/persistence behavior without any live AI call. Real local HTTP/proxy checks after restart also passed: capabilities 200 with exactly aiEnabled=false, disabled generation 503/provider_error, and hostile Origin rejection 403.

Native pointer automation did not establish a completed drop; do not treat the synthetic native-event tests as cross-browser pointer certification. Keyboard alternatives were verified in the browser. Full screen-reader, touch, mobile and performance audits were not run. The local dev workflow was left running for review. CI is configured but was not observed running remotely in this session.

## 6. Security verification

Preserve the same shared strict schema and structural preflight, inert text rendering, explicit DOM/style mapping, escaped controlled TSX export, client response revalidation, untrusted-storage recovery and server-only provider imports. Existing hostile-text/export/compiler tests and the actual canary-secret client-build test pass with the new editor and patched validator. API errors/logs use fixed safe messages and metadata; original prompts, credentials and provider exception/refusal text are not forwarded. No new mutation API or provider was added.

Structural edits are pure and committed atomically after validation. Drops cannot deserialize external IR/HTML or execute content; root/cycle/leaf/resource guards remain independent of UI restrictions. History cannot reintroduce invalid data and has entry/payload bounds. Deleted content remains in bounded in-memory history until pruned/reload, so undoable reset is not secure erasure. localStorage remains unencrypted. Prompt delimiters do not eliminate injection; schema and inert render/export boundaries remain the execution guarantee.

The initial audit's high advisory was fixed, not ignored: patched native Zod v4, no v3 compatibility path, native schema export, unchanged v1 contract and all regression cases passing. A zero-advisory audit does not certify production security.

## 7. Known limitations and technical debt

One browser-local design, no persistent history/backup, multi-select, additional components, generated responsive variants, cross-document drag, imported drop payloads or collaborative editing. Collapse state resets when switching panels. Text edits are one history operation per Enter/blur, not per keystroke. Factory IDs are deterministic/unique within the current document, not global collaboration identifiers. Serialized history limits do not represent exact heap limits. Native pointer/touch/browser compatibility needs dedicated end-to-end coverage; use move controls when pointer dragging is unavailable.

No authentication, production rate limiting, database, billing, deployment, progress SSE or new provider. Existing provider limits remain dev-grade and cancellation cannot refund tokens already consumed. No full security/accessibility audit or measured performance budget was completed.

## 8. Unverified functionality

No API key/model was available; no live OpenAI request or live eval was run. Real account/model compatibility, JSON-mode/temperature support, model-quality repair rates, real refusal behavior, token costs and latency remain unverified. Native pointer-drop completion, touch and screen-reader behavior remain unverified beyond event tests/keyboard browser checks. Remote GitHub CI and production deployment/headers were not run.

## 9. Git hygiene

Focused local commits cover the AI review, pure operations/history, security-driven dependency update, workspace integration and final documentation. No push, force-push or history rewrite. The starting commit remains in history. Final commit IDs are reported in the chat; no generated screenshot/build files are stored in Git.

## 10. Recommended Phase 4 work

1. With authorized credentials, establish an account-accessible model, verify compatibility and run the unchanged live eval corpus. Inspect refusal/truncation/repair failures without weakening validation, and agree on quality targets.
2. Add real pointer/touch browser end-to-end tests and assistive-technology coverage. Audit focus management, contrast, errors and editable-field shortcuts across engines/devices.
3. Review CSP, threat model, body/output resource ceilings, history memory/latency and dependency monitoring; measure actual rendering/history performance before setting budgets.
4. Decide deployment exposure and implement appropriate authenticated access, cost/abuse controls, privacy-aware observability, operational limits and recovery practices before exposing a provider-backed server publicly.
5. Verify production builds/headers, secret provisioning, deployment/rollback and remote CI. Keep richer component/variant work separately versioned with migration/renderer/exporter tests.
