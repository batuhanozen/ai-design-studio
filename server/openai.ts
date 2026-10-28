import OpenAI from "openai";
import {
  type IRProvider,
  ProviderFailure,
  classifyProviderError,
} from "./provider";
export function createOpenAIProvider(apiKey: string): IRProvider {
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    logLevel: "off",
  });
  return {
    async generateIR(request) {
      try {
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
        if (
          response.output?.some(
            (item) =>
              item.type === "message" &&
              item.content.some((content) => content.type === "refusal"),
          )
        )
          throw new ProviderFailure(
            "provider_error",
            "provider_refusal",
            "The provider declined this request. Rephrase the design request and try again.",
          );
        if (response.status === "incomplete")
          throw new ProviderFailure(
            "provider_error",
            "provider_incomplete",
            "The provider did not finish the design. Try a smaller request or review the server output-token limit.",
          );
        if (response.status === "failed" || response.error)
          throw new ProviderFailure(
            "provider_error",
            "provider_unavailable",
            "The provider could not finish this request. Try again later.",
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
      } catch (error) {
        throw error instanceof ProviderFailure
          ? error
          : classifyProviderError(error);
      }
    },
  };
}
