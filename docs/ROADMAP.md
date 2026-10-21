# Roadmap

Status at planning: every item is **planned**. Update status only after implementation and testing.

## Phase 1 — Validated vertical slice
- **planned**: Versioned strict IR, constrained styles, structural validation, sample and invalid fixtures.
- **planned**: Deterministic prompt templates with explicit non-AI labeling; safe renderer.
- **planned**: Click selection, immutable inspector edits, read-only JSON.
- **planned**: Validated local persistence, recovery notice, reset.
- **planned**: JSON and deterministic React export, copy and download.
- **planned**: Validation, rendering, editor, storage, generator, and compiler tests; all quality gates.
- Exit: the complete offline prompt → edit → restore → export flow passes the documented checks.
- Non-goals: LLM endpoint, authentication, collaboration, billing, database, multiple providers, plugins, uploads, animations, responsive breakpoints, tree editor, undo/redo, drag/drop, multi-select.

## Phase 2 — AI generation quality
- **planned**: One server-side provider with protected credentials and strict IR-only response validation.
- **planned**: Prompt strategy, one bounded repair loop, evaluation corpus and quality metrics.
- **planned**: Streaming progress with final validation before acceptance.
- Exit: measured evaluation targets, malformed-output rejection, and secret isolation pass tests.
- Non-goals: multiple providers, arbitrary generated code, richer editing, production launch.

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
