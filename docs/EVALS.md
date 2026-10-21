# Generation evaluations

## Corpus and purpose

`evals/prompts.json` contains 30 fixed requests: login, pricing, dashboard headers, settings, onboarding, empty states, vague requests, German/Spanish/Turkish requests, a long request and five adversarial requests (script markup, javascript links, event handlers, unsupported components, excessive tree size). Each has minimum component counts and optional case-insensitive keyword alternatives. These expectations are independent of validity and apply unchanged to both AI and deterministic templates. They test simple structure/content, not visual quality, full instruction following, or accessibility.

Corpus parsing enforces known component types and bounded prompts. Do not reduce expectations, relax the IR, or rewrite prompts to improve scores. Add regression cases when live failures are observed. No ID canonicalization is implemented: no live evidence yet establishes duplicate/missing IDs as a dominant failure.

## Offline (CI, no network/key)

```sh
npm run eval:offline
```

All 30 prompts cross the same prompt builder → provider interface → bounded parser → unchanged Zod validator → bounded repair pipeline. A fresh hand-written mock provider per case selects one of six transport scenarios, five cases each:

| Fixture                                 | Expected behavior                   |
| --------------------------------------- | ----------------------------------- |
| Good sample JSON                        | Accepted on attempt 1               |
| Unknown component then valid sample     | Accepted after 1 repair             |
| Unknown component on every attempt      | Rejected after repair exhaustion    |
| Non-JSON on every attempt               | Rejected after repair exhaustion    |
| Provider ignores abort / never resolves | Deadline returns timeout; no repair |
| Provider exception                      | Safe provider_error; no repair      |

Valid mock responses reuse Phase 1 samples chosen by the deterministic generator. This makes a reproducible transport/validation regression harness, **not an estimate of AI capability**. The script exits nonzero if a fixture outcome differs from its prescription; expected fixture failures do not fail CI. A virtual clock advances 5 ms per mock attempt, so offline latency/usage are synthetic. Tests separately verify determinism and summary math. Baseline runs the real deterministic generator on the identical corpus/expectations.

Verified fixture results on 2026-10-21:

| Metric                              | Offline fixtures                               |
| ----------------------------------- | ---------------------------------------------- |
| First-attempt validity              | 5/30 = 16.67%                                  |
| Final validity                      | 10/30 = 33.33%                                 |
| Repair success                      | 5/15 = 33.33%                                  |
| Average attempts                    | 1.5                                            |
| Latency p50 / p95                   | 5 / 10 ms (virtual)                            |
| Input / output tokens               | 3,500 / 700 (mock usage)                       |
| Structural expectation pass rate    | 8/30 = 26.67%                                  |
| Final failures                      | 10 invalid_output, 5 timeout, 5 provider_error |
| Deterministic baseline validity     | 30/30 = 100%                                   |
| Deterministic baseline expectations | 18/30 = 60%                                    |

The intentionally bad fixtures dominate offline failures. Baseline mismatches are settings/onboarding/empty-state requests, non-English labeling, and requests beyond four templates. This is evidence of limited template coverage, not a reason to lower expectations. Validity alone is not generation quality.

## Live (manual, billable)

Configure `OPENAI_API_KEY` and an explicit `LLM_MODEL` in `.env`, then:

```sh
npm run eval:live
```

The script refuses to send requests without both settings. It uses the sole OpenAI adapter and same pipeline. Requests run sequentially and are paced by the configured dev rate window/rate. Limits/repairs/timeouts apply to each generation. A full corpus can make up to 90 provider calls with the hard-cap two repairs (default up to 60). Cancellation/timeout does not refund already consumed tokens. Do not run live eval in CI.

Results are written incrementally to ignored `evals/results/live-*.json`. They contain case IDs, outcome/error paths/codes, metrics, settings, usage and model, not raw prompts or generated designs. The tracked corpus contains the prompts. Review local files before sharing them. No live provider call or live quality result was verified in this session: neither an API key nor a configured model was available.

## Reading the summary

Rates use all cases as the denominator (including provider failures), except repair success: accepted-after-repair / cases where at least a second provider attempt was made. If no repair was attempted, the rate is null. Average attempts counts actual initiated calls, including failed/timed-out calls. Latency is whole-generation wall time in live runs, including validation and repairs; p50/p95 use nearest-rank percentiles. Structural expectation rate counts all cases, with invalid/provider-failed cases scoring false.

Token counts sum usage returned on completed attempts, including invalid outputs and repair attempts. Timed-out/failed calls may have unreported usage; totals and estimated cost can therefore be lower bounds. `usageReportedRequests` counts cases with any usage. Set `LLM_INPUT_USD_PER_MILLION` and `LLM_OUTPUT_USD_PER_MILLION` to operator-verified rates to calculate an estimate from returned usage; otherwise estimated cost is null. Rates are not inferred from model IDs. Cached-input discounts and other pricing tiers are not modeled. Baseline latency/cost are not compared with model latency/cost.

Before treating Phase 2 quality as established, run live eval with an accessible JSON-mode model, inspect individual failures, set quality targets, and add regression prompts without changing the schema to inflate scores.
