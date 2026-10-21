// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cases } from "./corpus";
import {
  evaluate,
  summarize,
  baseline,
  meetsExpectations,
  percentile,
  type EvalRow,
} from "./harness";
import { fixtureProvider } from "./fixtures";
import { readConfig } from "../server/config";
import { samples } from "../src/ir/samples";
async function offline() {
  let time = 0;
  return evaluate(
    cases,
    (test) =>
      fixtureProvider(test, () => {
        time += 5;
      }),
    { ...readConfig({}), model: "fixture", timeoutMs: 3 },
    () => time,
  );
}
describe("offline evaluations", () => {
  it("runs all 30 cases through parse/validate/repair deterministically with prescribed failures", async () => {
    const first = await offline();
    expect(first).toEqual(await offline());
    expect(first).toHaveLength(30);
    first.forEach((row, index) => {
      expect(row.ok).toBe(
        ["good", "repair"].includes(cases[index].offlineScenario),
      );
    });
    const summary = summarize(first);
    expect(summary).toMatchObject({
      total: 30,
      firstAttemptValidityRate: 5 / 30,
      finalValidityRate: 10 / 30,
      repairSuccessRate: 5 / 15,
      averageAttempts: 1.5,
      latencyMs: { p50: 5, p95: 10 },
      usage: { inputTokens: 3500, outputTokens: 700 },
      failures: { invalid_output: 10, timeout: 5, provider_error: 5 },
      validationErrors: { invalid_union_discriminator: 5, invalid_json: 5 },
    });
    expect(baseline(cases).validityRate).toBe(1);
  });
  it("computes summary denominators, nearest-rank percentiles, token totals and optional costs", () => {
    const common = {
      id: "a",
      ok: true,
      firstValid: true,
      attemptedRepair: false,
      repaired: false,
      attempts: 1,
      latencyMs: 10,
      structure: true,
      errors: [],
    } satisfies EvalRow;
    const rows = [
      { ...common, usage: { inputTokens: 100, outputTokens: 20 } },
      {
        ...common,
        id: "b",
        firstValid: false,
        attemptedRepair: true,
        repaired: true,
        attempts: 2,
        latencyMs: 30,
        structure: false,
        usage: { inputTokens: 200, outputTokens: 40 },
      },
      {
        ...common,
        id: "c",
        ok: false,
        firstValid: false,
        attemptedRepair: true,
        attempts: 2,
        latencyMs: 20,
        structure: false,
        kind: "invalid_output",
      },
    ];
    expect(summarize(rows, { input: 1, output: 2 })).toMatchObject({
      firstAttemptValidityRate: 1 / 3,
      finalValidityRate: 2 / 3,
      repairSuccessRate: 0.5,
      averageAttempts: 5 / 3,
      latencyMs: { p50: 20, p95: 30 },
      usage: { inputTokens: 300, outputTokens: 60 },
      usageReportedRequests: 2,
      estimatedCostUSD: 0.00042,
      structuralExpectationPassRate: 1 / 3,
    });
    expect(summarize(rows).estimatedCostUSD).toBeNull();
    expect(summarize([])).toMatchObject({
      total: 0,
      finalValidityRate: 0,
      repairSuccessRate: null,
      latencyMs: { p50: null, p95: null },
    });
    expect(percentile([9, 2, 7, 4], 0.5)).toBe(4);
  });
  it("grades structure and semantic keywords separately from validity", () => {
    expect(
      meetsExpectations(samples[0], {
        minTypes: { Input: 2 },
        keywordsAny: ["WELCOME"],
      }),
    ).toBe(true);
    expect(
      meetsExpectations(samples[0], {
        minTypes: { Input: 3 },
        keywordsAny: [],
      }),
    ).toBe(false);
    expect(
      meetsExpectations(samples[0], {
        minTypes: { Input: 2 },
        keywordsAny: ["settings"],
      }),
    ).toBe(false);
    expect(
      meetsExpectations({}, { minTypes: { Text: 1 }, keywordsAny: [] }),
    ).toBe(false);
  });
});
