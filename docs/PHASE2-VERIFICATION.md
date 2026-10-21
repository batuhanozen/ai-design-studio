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

Hygiene additions: `format:check` script, CI invocation, and an explicit current/unknown-version migration-hook test. README already had the Node prerequisite; .nvmrc and engines already matched Node 24. `npm run format:check` passed; `npm test` passed 36 tests in 4 files. Prettier parsed the workflow YAML; a local YAML parser additionally checked triggers/job/steps. `actionlint` is unavailable, so full actionlint validation was not run. GitHub CI has not run remotely in this session.
