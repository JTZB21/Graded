import type { NarratorProvider, NarratorRequest, ProviderConfig, ProviderId } from './types';

export class NarratorError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'NarratorError';
  }
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

abstract class HttpProvider implements NarratorProvider {
  constructor(protected readonly config: ProviderConfig, private readonly transport: typeof fetch = fetch) {}
  abstract generate(request: NarratorRequest): Promise<string>;

  protected async post(url: string, headers: Record<string, string>, body: object, request: NarratorRequest): Promise<Record<string, unknown>> {
    if (!this.config.apiKey.trim() || !this.config.model.trim()) {
      throw new NarratorError('Set an API key and model in narrator settings first.');
    }
    if (!request.messages.length || !request.messages.some(message => message.role === 'user')) {
      throw new NarratorError('A user message is required.');
    }
    if (!Number.isInteger(request.maxTokens ?? 2048) || (request.maxTokens ?? 2048) <= 0) {
      throw new NarratorError('The output token limit must be a positive integer.');
    }
    const signal = AbortSignal.any([AbortSignal.timeout(120_000), ...(request.signal ? [request.signal] : [])]);
    try {
      const response = await this.transport(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body), signal, credentials: 'omit', redirect: 'error',
      });
      if (!response.ok) {
        const hint = response.status === 401 || response.status === 403 ? 'Check your API key and account access.'
          : response.status === 429 ? 'Rate limit or account quota reached. Try again later.'
          : 'Check the model name and provider availability.';
        // Never surface provider response bodies: they can echo credentials/prompts.
        throw new NarratorError(`Narrator request failed (${response.status}). ${hint}`, response.status);
      }
      return record(await response.json());
    } catch (error) {
      if (error instanceof NarratorError) throw error;
      if (request.signal?.aborted) throw new NarratorError('Narrator request cancelled.');
      if (signal.aborted) throw new NarratorError('Narrator request timed out. Try again.');
      throw new NarratorError('Could not read the narrator response. Check your connection and browser access to the provider.');
    }
  }

  protected text(value: unknown): string {
    if (typeof value !== 'string' || !value.trim()) throw new NarratorError('The provider returned no usable text.');
    return value;
  }
}

export class NanoGPTProvider extends HttpProvider {
  async generate(request: NarratorRequest): Promise<string> {
    const data = await this.post('https://nano-gpt.com/api/v1/chat/completions', {
      Authorization: `Bearer ${this.config.apiKey.trim()}`,
    }, {
      model: this.config.model.trim(),
      messages: [{ role: 'system', content: request.system }, ...request.messages],
      max_tokens: request.maxTokens ?? 2048, stream: false,
    }, request);
    const choice = record(Array.isArray(data.choices) ? data.choices[0] : undefined);
    if (choice.finish_reason === 'length') throw new NarratorError('Narration was truncated. Increase the output token limit.');
    return this.text(record(choice.message).content);
  }
}

export class ClaudeProvider extends HttpProvider {
  async generate(request: NarratorRequest): Promise<string> {
    const data = await this.post('https://api.anthropic.com/v1/messages', {
      'x-api-key': this.config.apiKey.trim(), 'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }, {
      model: this.config.model.trim(), system: request.system, messages: request.messages,
      max_tokens: request.maxTokens ?? 2048, stream: false,
    }, request);
    if (data.stop_reason === 'max_tokens') throw new NarratorError('Narration was truncated. Increase the output token limit.');
    const blocks = Array.isArray(data.content) ? data.content : [];
    return this.text(blocks.map(record).filter(block => block.type === 'text' && typeof block.text === 'string').map(block => block.text).join('\n'));
  }
}

export function createNarratorProvider(id: ProviderId, config: ProviderConfig, transport?: typeof fetch): NarratorProvider {
  return id === 'claude' ? new ClaudeProvider(config, transport) : new NanoGPTProvider(config, transport);
}
