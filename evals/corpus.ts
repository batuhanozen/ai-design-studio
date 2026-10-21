import { z } from "zod";
import data from "./prompts.json";
const evalCaseSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1).max(4000),
    expect: z
      .object({
        minTypes: z.record(
          z.enum(["Stack", "Card", "Text", "Button", "Input"]),
          z.number().int().min(1).max(200),
        ),
        keywordsAny: z.array(z.string()),
      })
      .strict(),
    offlineScenario: z.enum([
      "good",
      "repair",
      "exhausted",
      "non_json",
      "timeout",
      "provider_error",
    ]),
  })
  .strict();
export type EvalCase = z.infer<typeof evalCaseSchema>;
export const cases = z.array(evalCaseSchema).length(30).parse(data);
