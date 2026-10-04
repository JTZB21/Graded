export type ProviderId = 'nanogpt' | 'claude';
export type ProviderConfig = { apiKey: string; model: string };
export type NarratorRequest = {
  system: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens?: number;
  signal?: AbortSignal;
};

// Raw text may contain plain structured proposals; callers must validate them
// with the engine before applying anything. Providers never receive game state.
export interface NarratorProvider {
  generate(request: NarratorRequest): Promise<string>;
}
