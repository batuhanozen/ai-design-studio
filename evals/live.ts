import { mkdir, writeFile } from "node:fs/promises";
import { cases } from "./corpus";
import { readConfig } from "../server/config";
import { createOpenAIProvider } from "../server/openai";
import {
  baseline,
  evalRow,
  summarize,
  type EvalRow,
  type Pricing,
} from "./harness";
import { runPipeline } from "../server/pipeline";
const config = readConfig();
if (!config.apiKey || !config.model)
  throw new Error(
    "Live evaluation requires OPENAI_API_KEY and an explicit LLM_MODEL. No requests were sent.",
  );
const input = Number(process.env.LLM_INPUT_USD_PER_MILLION),
  output = Number(process.env.LLM_OUTPUT_USD_PER_MILLION);
const pricing: Pricing | undefined =
  process.env.LLM_INPUT_USD_PER_MILLION &&
  process.env.LLM_OUTPUT_USD_PER_MILLION &&
  Number.isFinite(input) &&
  Number.isFinite(output) &&
  input >= 0 &&
  output >= 0
    ? { input, output }
    : undefined;
const provider = createOpenAIProvider(config.apiKey);
const rows: EvalRow[] = [];
const directory = new URL("./results/", import.meta.url);
await mkdir(directory, { recursive: true });
const file = new URL(
  `live-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  directory,
);
const report = () => ({
  mode: "live",
  model: config.model,
  pricing: pricing ?? null,
  settings: {
    maxOutputTokens: config.maxOutputTokens,
    repairAttempts: config.repairAttempts,
    temperature: config.temperature ?? null,
  },
  summary: summarize(rows, pricing),
  deterministicBaseline: baseline(cases),
  rows,
});
for (const test of cases) {
  rows.push(evalRow(test, await runPipeline(provider, test.prompt, config)));
  await writeFile(file, JSON.stringify(report(), null, 2));
  console.log(
    JSON.stringify({
      completed: rows.length,
      total: cases.length,
      ok: rows[rows.length - 1]?.ok,
    }),
  );
  // Deliberate sequential pacing; not a production billing or distributed quota control.
  await new Promise((resolve) =>
    setTimeout(resolve, config.rateWindowMs / config.rateLimit),
  );
}
console.log(JSON.stringify(report(), null, 2));
