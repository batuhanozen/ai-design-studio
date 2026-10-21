import { validateDesign, type DesignNode } from "../src/ir/schema";
import { generateDesign } from "../src/services/generator";
import { runPipeline, type PipelineReport } from "../server/pipeline";
import type { Limits } from "../server/config";
import type { IRProvider, Usage } from "../server/provider";
import type { EvalCase } from "./corpus";
export type { EvalCase } from "./corpus";
export type EvalRow = {
  id: string;
  ok: boolean;
  firstValid: boolean;
  attemptedRepair: boolean;
  repaired: boolean;
  attempts: number;
  latencyMs: number;
  structure: boolean;
  usage?: Usage;
  kind?: string;
  errors: { path: string; code: string }[];
};
export function meetsExpectations(
  candidate: unknown,
  expected: EvalCase["expect"],
): boolean {
  const result = validateDesign(candidate);
  if (!result.ok) return false;
  const counts: Record<string, number> = {};
  const text: string[] = [];
  function visit(node: DesignNode) {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    if ("text" in node.props) text.push(node.props.text);
    if ("placeholder" in node.props) text.push(node.props.placeholder);
    if ("children" in node) node.children.forEach(visit);
  }
  visit(result.design.root);
  return (
    Object.entries(expected.minTypes).every(
      ([type, min]) => (counts[type] ?? 0) >= (min ?? 0),
    ) &&
    (expected.keywordsAny.length === 0 ||
      expected.keywordsAny.some((keyword) =>
        text
          .join(" ")
          .toLocaleLowerCase("en")
          .includes(keyword.toLocaleLowerCase("en")),
      ))
  );
}
export function evalRow(test: EvalCase, report: PipelineReport): EvalRow {
  const { result, meta } = report;
  return {
    id: test.id,
    ok: result.ok,
    firstValid: meta.firstAttemptValid,
    attemptedRepair: meta.attempts > 1,
    repaired: meta.repaired,
    attempts: meta.attempts,
    latencyMs: meta.latencyMs,
    structure: result.ok && meetsExpectations(result.design, test.expect),
    usage: meta.usage,
    ...(!result.ok ? { kind: result.kind } : {}),
    errors: result.ok
      ? []
      : result.errors.map(({ path, code }) => ({ path, code })),
  };
}
export function percentile(values: number[], percent: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(percent * sorted.length) - 1)];
}
export type Pricing = { input: number; output: number };
export function summarize(rows: EvalRow[], pricing?: Pricing) {
  const count = rows.length;
  const repaired = rows.filter((row) => row.attemptedRepair);
  const usage = rows.reduce(
    (sum, row) => ({
      inputTokens: sum.inputTokens + (row.usage?.inputTokens ?? 0),
      outputTokens: sum.outputTokens + (row.usage?.outputTokens ?? 0),
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
  const usageReportedRequests = rows.filter((row) => row.usage).length;
  const failures: Record<string, number> = {};
  const validationErrors: Record<string, number> = {};
  for (const row of rows) {
    if (row.kind) failures[row.kind] = (failures[row.kind] ?? 0) + 1;
    for (const error of row.errors)
      validationErrors[error.code] = (validationErrors[error.code] ?? 0) + 1;
  }
  return {
    total: count,
    firstAttemptValidityRate: count
      ? rows.filter((row) => row.firstValid).length / count
      : 0,
    finalValidityRate: count ? rows.filter((row) => row.ok).length / count : 0,
    repairSuccessRate: repaired.length
      ? repaired.filter((row) => row.repaired).length / repaired.length
      : null,
    averageAttempts: count
      ? rows.reduce((sum, row) => sum + row.attempts, 0) / count
      : 0,
    latencyMs: {
      p50: percentile(
        rows.map((row) => row.latencyMs),
        0.5,
      ),
      p95: percentile(
        rows.map((row) => row.latencyMs),
        0.95,
      ),
    },
    usage,
    usageReportedRequests,
    estimatedCostUSD:
      pricing && usageReportedRequests
        ? (usage.inputTokens * pricing.input +
            usage.outputTokens * pricing.output) /
          1000000
        : null,
    structuralExpectationPassRate: count
      ? rows.filter((row) => row.structure).length / count
      : 0,
    failures,
    validationErrors,
  };
}
export function baseline(cases: EvalCase[]) {
  return {
    total: cases.length,
    validityRate: cases.length
      ? cases.filter((test) => validateDesign(generateDesign(test.prompt)).ok)
          .length / cases.length
      : 0,
    structuralExpectationPassRate: cases.length
      ? cases.filter((test) =>
          meetsExpectations(generateDesign(test.prompt), test.expect),
        ).length / cases.length
      : 0,
  };
}
export async function evaluate(
  cases: EvalCase[],
  factory: (test: EvalCase) => IRProvider,
  limits: Limits,
  clock?: () => number,
): Promise<EvalRow[]> {
  const rows: EvalRow[] = [];
  for (const test of cases)
    rows.push(
      evalRow(
        test,
        await runPipeline(factory(test), test.prompt, limits, undefined, clock),
      ),
    );
  return rows;
}
