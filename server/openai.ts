import OpenAI from "openai";
import type { IRProvider } from "./provider";
export function createOpenAIProvider(apiKey: string): IRProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    logLevel: "off",
  });
  return {
    async generateIR(request) {
      const response = await client.responses.create(
        {
          model: request.model,
          instructions: request.system,
          input: [{ role: "user", content: request.user }],
          text: { format: { type: "json_object" } },
          store: false,
          max_output_tokens: request.maxOutputTokens,
          ...(request.temperature === undefined
            ? {}
            : { temperature: request.temperature }),
        },
        { signal: request.signal, maxRetries: 0 },
      );
      return {
        text: response.output_text,
        ...(response.usage
          ? {
              usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
              },
            }
          : {}),
      };
    },
  };
}
