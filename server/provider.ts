export type Usage = { inputTokens: number; outputTokens: number };
export type ProviderRequest = {
  model: string;
  system: string;
  user: string;
  maxOutputTokens: number;
  temperature?: number;
  signal: AbortSignal;
};
export type ProviderResponse = { text: string; usage?: Usage };
export interface IRProvider {
  generateIR(request: ProviderRequest): Promise<ProviderResponse>;
}

// Only fixed, application-authored diagnostics may cross the provider boundary.
export class ProviderFailure extends Error {
  constructor(
    public kind: "provider_error" | "rate_limited" | "timeout",
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function classifyProviderError(error: unknown): ProviderFailure {
  const value =
    error && typeof error === "object"
      ? (error as Record<string, unknown>)
      : {};
  if (value.name === "APIConnectionTimeoutError")
    return new ProviderFailure(
      "timeout",
      "provider_timeout",
      "The provider timed out. Try a smaller request.",
    );
  if (value.name === "APIConnectionError")
    return new ProviderFailure(
      "provider_error",
      "provider_connection",
      "The server could not connect to OpenAI. Check its network connection.",
    );
  if (value.status === 401 || value.status === 403)
    return new ProviderFailure(
      "provider_error",
      "provider_auth",
      "OpenAI access was denied. Check the server API key and project permissions.",
    );
  if (value.status === 404)
    return new ProviderFailure(
      "provider_error",
      "provider_model",
      "The configured model is unavailable. Check LLM_MODEL and account access.",
    );
  if (value.status === 400)
    return new ProviderFailure(
      "provider_error",
      "provider_configuration",
      "The configured model or generation settings were not accepted. Check JSON-mode and temperature support.",
    );
  if (value.status === 429) {
    if (
      [
        "insufficient_quota",
        "organization_spend_limit_exceeded",
        "project_spend_limit_exceeded",
        "organization_usage_limit_exceeded",
      ].includes(String(value.code))
    )
      return new ProviderFailure(
        "provider_error",
        "provider_quota",
        "The OpenAI project has reached a quota or spending limit. Check its billing and limits before retrying.",
      );
    return new ProviderFailure(
      "rate_limited",
      "provider_rate_limit",
      "OpenAI is rate limiting requests. Wait before trying again.",
    );
  }
  if (typeof value.status === "number" && value.status >= 500)
    return new ProviderFailure(
      "provider_error",
      "provider_unavailable",
      "OpenAI is temporarily unavailable. Try again later.",
    );
  return new ProviderFailure(
    "provider_error",
    "provider_error",
    "The provider request could not be completed. Check server configuration and try again.",
  );
}
