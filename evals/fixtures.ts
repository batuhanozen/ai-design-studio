import { generateDesign } from "../src/services/generator";
import type { IRProvider } from "../server/provider";
import type { EvalCase } from "./harness";
// Hand-written transport fixtures exercise failure handling, not model intelligence.
export function fixtureProvider(
  test: EvalCase,
  tick: () => void = () => {},
): IRProvider {
  let calls = 0;
  return {
    async generateIR() {
      calls++;
      tick();
      if (test.offlineScenario === "timeout") return new Promise(() => {});
      if (test.offlineScenario === "provider_error")
        throw new Error("Fixture provider unavailable");
      const good = JSON.stringify(generateDesign(test.prompt));
      const invalid = JSON.stringify({
        ...generateDesign(test.prompt),
        root: {
          id: "bad",
          type: "Video",
          props: { src: "javascript:alert(1)" },
        },
      });
      return {
        text:
          test.offlineScenario === "non_json"
            ? "This is not JSON."
            : test.offlineScenario === "exhausted" ||
                (test.offlineScenario === "repair" && calls === 1)
              ? invalid
              : good,
        usage: { inputTokens: 100, outputTokens: 20 },
      };
    },
  };
}
