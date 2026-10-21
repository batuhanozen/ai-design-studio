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
