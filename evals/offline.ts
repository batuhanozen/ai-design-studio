import { cases } from "./corpus";
import { evaluate, baseline, summarize } from "./harness";
import { fixtureProvider } from "./fixtures";
import { readConfig } from "../server/config";
let time = 0;
const rows = await evaluate(
  cases,
  (test) =>
    fixtureProvider(test, () => {
      time += 5;
    }),
  { ...readConfig({}), model: "offline-fixture", timeoutMs: 5 },
  () => time,
);
console.log(
  JSON.stringify(
    {
      mode: "offline-fixtures",
      notice:
        "Synthetic transport fixtures; not live model quality. Latency uses a deterministic virtual clock.",
      summary: summarize(rows),
      deterministicBaseline: baseline(cases),
    },
    null,
    2,
  ),
);
// Failure fixtures are expected. Assert their prescribed behavior, not inflated success scores.
for (let i = 0; i < cases.length; i++) {
  const expected = ["good", "repair"].includes(cases[i].offlineScenario);
  if (rows[i].ok !== expected)
    throw new Error(`Unexpected fixture outcome: ${cases[i].id}`);
}
