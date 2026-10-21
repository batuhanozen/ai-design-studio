# Phase 2 verification

## Starting state and Phase 1 hardening

On 2026-10-21 the working tree was clean at `cfc421c`, following `db600ca` (Phase 1 implementation) and `bf69f9e` (roadmap). The repository contained the complete Phase 1 source, four documentation/guidance files, tests, manifests/lockfile, .nvmrc, env example, and GitHub workflow. No server or eval harness existed. PATH selected Node 16.17.0/npm 8.15.0; project requirements and .nvmrc correctly required Node 24.x. Checks selected the already installed Node 24.19.0 runtime via:

```sh
export PATH="/Users/Apple/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
export npm_config_cache=/tmp/ai-design-studio-npm-cache
```

A fresh local clone was made with `git clone --no-hardlinks /Users/Apple/Documents/GitHub/ai-design-studio /tmp/ai-design-studio-phase1-verification`. Inside it, `npm ci --offline`, `npm run build`, `npm run lint`, `npm run typecheck`, and `npm test` all exited 0. Tests: 3 files, 35 passed. Installation used cached lockfile packages with zero reported advisories. No Phase 1 failure needed fixing.

Two independent temporary mutations in that clone verified existing boundaries:

- Removed `.strict()` from Text props: `npm test -- src/ir/schema.test.ts` exited 1, with 1 failed / 17 passed. The unknown-prop rejection test caught it.
- Removed the less-than escaping step from the code generator: `npm test -- src/services/services.test.ts` exited 1, with 1 failed / 10 passed. The hostile-string export test caught it.

Both mutations were restored in a finally block. `git status --short` in the clone was empty afterward. Original Phase 1 tests were unchanged.

Hygiene additions: `format:check` script, CI invocation, and an explicit current/unknown-version migration-hook test. README already had the Node prerequisite; .nvmrc and engines already matched Node 24. `npm run format:check` passed; `npm test` passed 36 tests in 4 files. Prettier parsed the workflow YAML; its YAML parser AST was also checked for expected trigger/job/step values. No separate YAML package was available. `actionlint` is unavailable, so full actionlint validation was not run. GitHub CI has not run remotely in this session.

## Phase 2 implementation and final checks

Implemented one official OpenAI SDK adapter (7.39.0), native Node HTTP server, environment-only configuration, shared validation, schema-derived prompting through zod-to-json-schema 3.25.1, bounded parse/repair, client modes/loading/cancel/response validation, a thirty-case eval corpus and offline/manual-live runners. The SDK's Zod peer required a compatible major-3 update to 3.25.76; no IR rule or schema version was relaxed. React style mapping moved from `src/ir/styles.ts` to `src/components/nodeStyle.ts` so `src/ir` has no React/DOM imports. The three original Phase 1 test files are byte-unchanged (`git diff cfc421c -- src/ir/schema.test.ts src/components/ui.test.tsx src/services/services.test.ts` produced no output).

Official documentation URLs and checked date (2026-10-21), the docs-first threat model, data flow and implementation decisions are in ARCHITECTURE.md. Scope remains Phase 2 only. SSE was explicitly assessed last and skipped to avoid a second transport/parser path; no partial/unvalidated design is accepted.

The final checks ran using the Node 24 PATH/cache exports above. All final commands exited 0:

| Exact command                               | Result                                                                                                                                                                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci --offline --engine-strict`          | 304 packages installed; audited 305; compatible engines; zero reported vulnerabilities.                                                                                                                                  |
| `npm run build`                             | Strict TypeScript and Vite production client build passed: 36 modules, JS 217.57 kB / 65.69 kB gzip, CSS 9.02 kB / 2.67 kB gzip.                                                                                         |
| `npm run lint`                              | Zero errors/warnings. No rules disabled.                                                                                                                                                                                 |
| `npm run typecheck`                         | No diagnostics.                                                                                                                                                                                                          |
| `npm test`                                  | 9 files, **66 tests passed**, no skipped tests. Includes a real client build with server canary key/model in its environment; every emitted artifact was checked and contained neither canary nor the provider endpoint. |
| `npm run format:check`                      | All matched files conform to Prettier.                                                                                                                                                                                   |
| `npm run eval:offline`                      | All 30 prescribed fixture outcomes matched; deterministic summary passed.                                                                                                                                                |
| `npm audit`                                 | Zero vulnerabilities.                                                                                                                                                                                                    |
| `git diff --check`                          | No whitespace errors.                                                                                                                                                                                                    |
| `git check-ignore evals/results/probe.json` | Live-result path is ignored.                                                                                                                                                                                             |

`npm run format` was used before the gates. An intermediate formatter check flagged one new file; formatting it and rerunning the complete gate sequence resolved it. The first tsx CLI invocation tried to create a local IPC listener blocked by the sandbox; the offline script now uses `node --import tsx`, which runs without a listener. A Vite config import and strict TypeScript inference issues found during implementation were fixed before the final gate run. No check remains blocked.

Tests cover API acceptance/invalid rejection, repaired/exhausted/non-JSON output, single-fence handling, output bytes and bounded repair/error reports, whole-request timeouts, cancellation/no retry, invalid/oversized prompts and bodies, strict body keys, configuration limits, rate windows/concurrency, hostile Host/Origin checks, no CORS, safe errors and metadata-only logs, SDK JSON-mode/settings/signal contract, schema/catalog synchronization, capability/mode/loading/cancel UI, late-result rejection, failed/tampered responses preserving state, canary isolation, corpus grading and summary math.

## Running workflow and browser smoke

`npm run dev` started both API and Vite with no key on loopback ports 3001/5173. Real HTTP requests through the Vite proxy verified:

- `GET /api/capabilities`: 200, exactly `{ "aiEnabled": false }`.
- `POST /api/generate` with a valid prompt and no configured key: 503, structured provider_error; no raw prompt/config in response/logs.
- `POST /api/generate` with a hostile Origin: 403.

In the actual browser, the mode controls were visible, AI was disabled with an explanation, and submitting a pricing prompt through Deterministic samples produced the pricing design. Reset/reload returned the studio to login. Stopping the supervisor stopped both listeners (confirmed with lsof); the final supervisor was restarted and left available for review. No browser AI success is claimed.

The workflow YAML was parsed again locally with Prettier's YAML parser after adding offline eval; expected trigger/job/check scalars were checked. Full actionlint remains unavailable. GitHub CI has not run remotely and no commit was pushed.

## Eval results and remaining verification

Offline fixtures: 5/30 first-attempt valid; 10/30 finally valid; 5/15 successful repairs; 1.5 average attempts; virtual latency p50/p95 5/10 ms; mock usage 3,500 input and 700 output tokens; 8/30 structural expectation passes. Intended failures: 10 invalid outputs (5 unknown component, 5 non-JSON), 5 timeouts, 5 provider errors. Deterministic baseline: 30/30 valid, 18/30 structural passes. These synthetic failures prove handling, not live model quality. Settings/onboarding/empty-state/language and oversized-layout requests expose the four-template baseline's limits; expectations were not lowered. See EVALS.md for exact denominators and cost/usage caveats.

A presence-only environment check found no OPENAI_API_KEY and no LLM_MODEL; no .env was present. No live generation or `eval:live` run was attempted. Real model compatibility, output quality, provider refusal behavior, real token costs/latency and live-result writing remain unverified. Progress SSE is not implemented. Production authentication/rate limiting, CSP, security/accessibility audits, observability, performance budgets and deployment remain out of scope.

Run without credentials: select Node 24, `npm ci`, `npm run dev`, then choose Deterministic samples. With credentials: copy `.env.example` to `.env`, set OPENAI_API_KEY and an explicit account-accessible JSON-mode LLM_MODEL, restart `npm run dev`, and choose AI (server). `npm run eval:live` is a separate optional manual/billable evaluation; no API secret belongs in VITE variables.

Next: establish live evaluation targets and inspect failures without weakening the IR; then Phase 3 component/tree/history/reordering work, followed by Phase 4 audits, CSP, operational controls and deployment verification.
