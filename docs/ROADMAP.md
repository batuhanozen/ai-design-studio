# Roadmap

The roadmap was written before application code, with every item marked **planned**. Phase 1 items below are now **implemented and verified** by the checks in VERIFICATION.md on 2026-10-21. Phase 2 implementation is verified with offline/mock checks; live model quality is not verified. Phases 3–4 remain **planned**.

## Phase 1 — Validated vertical slice

- **implemented and verified**: Versioned strict IR, constrained styles, structural validation, sample and invalid fixtures.
- **implemented and verified**: Deterministic prompt templates with explicit non-AI labeling; safe renderer.
- **implemented and verified**: Click selection, immutable inspector edits, read-only JSON.
- **implemented and verified**: Validated local persistence, recovery notice, reset.
- **implemented and verified**: JSON and deterministic React export, copy and download.
- **implemented and verified**: Validation, rendering, editor, storage, generator, and compiler tests; all quality gates.
- Exit: the complete offline prompt → edit → restore → export flow passes the documented checks.
- Non-goals: LLM endpoint, authentication, collaboration, billing, database, multiple providers, plugins, uploads, animations, responsive breakpoints, tree editor, undo/redo, drag/drop, multi-select.

## Phase 2 — AI generation quality

- **implemented and verified offline**: One OpenAI adapter, server-only credentials/model/limits, loopback API, capabilities, proxy, bounded requests, dev-grade rate/concurrency controls and metadata-only logging.
- **implemented and verified offline**: Schema-derived prompt catalog, validated examples, strict JSON parsing, shared Zod acceptance and bounded repair (default 1, hard cap 2). No ID canonicalization.
- **implemented and verified offline**: Explicit sample/AI mode controls, disabled-state explanation, loading/cancel, structured errors, client revalidation and unchanged persistence/rendering path.
- **implemented and verified offline**: Thirty-case corpus, deterministic fixture pipeline, structural expectations, baseline comparison, metric math, SDK adapter mocks and canary-secret client-build check. All original Phase 1 tests still pass unchanged.
- **implementation present; live verification planned**: Manual live runner, ignored incremental results, usage/optional cost estimates and model-quality evaluation. No key/model was available; no live results are claimed.
- **deferred (not implemented)**: Progress-only SSE. Loading/cancel with one final validated JSON response keeps this phase small; partial IR is never rendered.
- Exit: Offline vertical slice and safety checks pass. **Live quality exit remains open**: select an accessible model, run live eval, inspect failures and establish measured quality targets before declaring generation quality complete.
- Non-goals: multiple providers, authentication, database, billing, deployment, production rate limiting, new components, chat editing, richer editing, production launch.

## Phase 3 — Richer editing

- **planned**: Additional allowlisted components with schema/renderer/exporter coverage.
- **planned**: Tree panel, undo/redo, drag/reorder, responsive variants, migration tests.
- Exit: all edit operations preserve valid IR; history and variant round trips pass tests.
- Non-goals: collaboration, billing, plugin execution, production operations.

## Phase 4 — Production readiness

- **planned**: Security review, CSP, dependency/runtime upgrades, observability and privacy policy.
- **planned**: Accessibility audit, performance budgets, deployment and recovery procedures.
- Exit: security and accessibility findings addressed, performance budgets met, deployment and rollback verified.
- Non-goals: unrestricted code execution, unreviewed components, speculative enterprise features.
