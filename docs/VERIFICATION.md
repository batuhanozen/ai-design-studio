# Phase 1 verification report

Verified on 2026-10-21 (Europe/Berlin). This report describes local verification; the added GitHub Actions workflow has not been run remotely in this session.

## 1. Repository state found

Initial commit: `aa7e48a Initial commit`. The working tree was clean. Files: a two-line aspirational README, MIT LICENSE, Python-oriented .gitignore, and .git. No application source, manifests, lockfiles, build/test/lint configuration, CI files, or root AGENTS.md existed.

Inspection used `ls -la`, `rg --files --hidden -g '!.git/**' -g '!node_modules/**'`, `cat README.md`, `cat .gitignore`, `cat LICENSE`, `git status --short`, `git log -5 --oneline`, `node --version`, and `npm --version`. The initial PATH runtime was Node 16.17.0 / npm 8.15.0. There were no existing application features to preserve. AGENTS.md and the planned four-phase roadmap were written before application code.

## 2. Implemented and verified

The local vertical slice implements strict versioned IR, five allowlisted node types, four sample templates, bounded structures/styles/text, path-specific errors, deterministic generation, safe preview, click/keyboard selection, immutable validated edits, read-only JSON, versioned local storage/recovery/reset, and JSON/React copying and downloads. No LLM is involved. The export compiler tests cover all four samples and hostile text.

The final stack is Vite 8.3.5, React/ReactDOM 18.3.1, TypeScript 5.6.3 (strict), Zod 3.23.8, Vitest 5.0.5, React Testing Library 14.3.1, user-event 14.5.2, ESLint 10.13.0, typescript-eslint 8.72.0, Prettier 3.2.5, and plain CSS. Exact direct/transitive versions are locked in package-lock.json.

For all final npm checks, the shell selected the already installed Node 24.19.0 runtime:

```sh
export PATH="/Users/Apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export npm_config_cache=/tmp/ai-design-studio-npm-cache
```

| Exact command                      | Final result                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --offline --engine-strict` | Passed: 299 packages installed; all engines compatible; cached installation reproducible.                                 |
| `npm run build`                    | Passed: TypeScript check and Vite production build; 25 modules, JS 214.33 kB (65.21 kB gzip), CSS 8.22 kB (2.49 kB gzip). |
| `npm run lint`                     | Passed: zero errors or warnings; no disabled rules.                                                                       |
| `npm run typecheck`                | Passed: strict TypeScript, no diagnostics.                                                                                |
| `npm test`                         | Passed: 3 test files, 35 tests; no skipped tests.                                                                         |
| `npm audit`                        | Passed: zero reported vulnerabilities across installed dependencies at verification time.                                 |
| `npm run format`                   | Completed across sources/configs/docs.                                                                                    |
| `git diff --check`                 | Passed before final documentation commit.                                                                                 |
| `npm run dev`                      | Started Vite on http://127.0.0.1:5173 using Node 24.                                                                      |

Tests cover valid/invalid fixtures, exact error paths/codes, unknown types/props, forbidden colors, bounded text/sizes/spacing, depth/count, duplicate IDs, cycles, inert hostile text, DOM prop isolation, immutable edits and invalid edits, selection/inspector flows, generator determinism, persistence recovery/round trips, clipboard success/failure, download wiring, JSON round trips, component identifier rejection, deterministic TSX escaping, and real TypeScript compiler checks of generated TSX.

Browser smoke test: inspected the rendered layout, clicked the login title, changed it to “A space for your next idea.” through the inspector, reloaded and observed the saved edit, submitted an invalid `javascript:` color and observed the exact inline error while the preview remained intact, reset the sample, opened React export, and downloaded a real `GeneratedDesign.tsx` file (1,507 bytes). Returned the browser to the default preview. The dev server was left running for review.

Earlier verification found a TypeScript flatMap inference error; the formatter now explicitly returns typed validation errors. The first Node-16-compatible install ran all tests but had development dependency advisories and incompatible transitive engine requirements. It was replaced with the available Node 24 runtime/current tooling, and a clean strict-engine installation plus all gates were rerun successfully. Initial sandbox restrictions on dependency networking, local listening, and Git metadata writes were resolved through approved tool escalation. No check remains blocked.

## 3. Limitations and not done

Only four keyword templates are supported; arbitrary prompts do not synthesize layouts. No optional LLM server, API keys, streaming or repair loop. One local design, no import UI, undo/redo, tree editing, drag/drop, multi-select, or generated breakpoints. Preview inputs have ephemeral local values; buttons have no application action. No authentication, collaboration, billing, database, multiple providers, plugin system, uploads, or animations. No production deployment, full accessibility/security audit, CSP rollout, observability or performance budget. Mobile layout and other browser engines were not manually audited. GitHub CI is configured but has not been observed running remotely. No changes were pushed.

## 4. Run locally

Select Node 24.x with your preferred Node manager (or the already installed runtime above), then:

```sh
cd /Users/Apple/Documents/GitHub/ai-design-studio
npm ci
npm run dev
```

Open http://127.0.0.1:5173. No API key or environment variables are needed. To repeat checks: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`.

## 5. Security notes

Every accepted design crosses strict validation. Unknown props/types are rejected; styles cannot carry URLs or executable strings; only containers carry children; IDs and tree resources are bounded. Render text is inert and DOM/style props are explicitly mapped. Controlled TSX templates serialize values in expression positions and reject unsafe component names; compiler tests verify the output. No model output or IR data is evaluated. Restore treats local storage as untrusted. The studio has no application network requests, provider keys or server endpoint. The dev server is bound to loopback.

Local storage is unencrypted and not a backup. A zero-advisory audit does not certify production safety. Production CSP, security review, dependency monitoring, accessibility and operational safeguards remain planned.

## 6. Next phases

- Phase 2: one server-only provider, IR-only prompt strategy, shared validation of responses, bounded repair, evaluation dataset/metrics, and streaming progress with final validation.
- Phase 3: new tested components, tree panel, immutable history for undo/redo, drag/reorder, and versioned responsive variants with migration tests.
- Phase 4: security and accessibility audits, CSP, privacy-aware observability, performance budgets, dependency/runtime review, deployment and rollback drills.
