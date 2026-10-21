export type Limits = {
  model: string;
  maxPromptLength: number;
  maxOutputTokens: number;
  timeoutMs: number;
  repairAttempts: number;
  rateLimit: number;
  rateWindowMs: number;
  maxOutputBytes: number;
  repairBytes: number;
  temperature?: number;
};
export type ServerConfig = Limits & { apiKey: string; port: number };
function integer(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max)
    throw new Error(`Invalid server setting: ${key}.`);
  return value;
}
export function readConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const apiKey = env.OPENAI_API_KEY?.trim() ?? "";
  const model = env.LLM_MODEL?.trim() ?? "";
  if (
    apiKey &&
    (!model || model.length > 100 || !/^[a-zA-Z0-9._:-]+$/.test(model))
  )
    throw new Error(
      "LLM_MODEL must be an explicit model identifier when AI is enabled.",
    );
  return {
    apiKey,
    model,
    port: integer(env, "API_PORT", 3001, 1024, 65535),
    maxPromptLength: integer(env, "LLM_MAX_PROMPT_LENGTH", 4000, 1, 8000),
    maxOutputTokens: integer(env, "LLM_MAX_OUTPUT_TOKENS", 4096, 256, 12000),
    timeoutMs: integer(env, "LLM_TIMEOUT_MS", 30000, 100, 120000),
    repairAttempts: integer(env, "LLM_REPAIR_ATTEMPTS", 1, 0, 2),
    rateLimit: integer(env, "LLM_RATE_LIMIT", 6, 1, 60),
    rateWindowMs: integer(env, "LLM_RATE_WINDOW_MS", 60000, 1000, 3600000),
    maxOutputBytes: integer(env, "LLM_MAX_OUTPUT_BYTES", 100000, 1000, 200000),
    repairBytes: integer(env, "LLM_REPAIR_BYTES", 12000, 1000, 20000),
    ...(env.LLM_SUPPORTS_TEMPERATURE === "true" ? { temperature: 0.2 } : {}),
  };
}
