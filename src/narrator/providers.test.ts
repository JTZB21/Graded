import { describe, expect, it, vi } from 'vitest';
import { createNarratorProvider } from './providers';
import type { ProviderId } from './types';

const config = { apiKey: ' test-key ', model: ' test-model ' };
const request = { system: 'Narrate only.', messages: [{ role: 'user' as const, content: 'Look around.' }] };
const response = (data: unknown) => new Response(JSON.stringify(data));

describe('provider wire formats', () => {
  it('sends OpenAI-compatible messages to NanoGPT and preserves plain structured output', async () => {
    const text = 'A quiet street.\n{"proposals":[]}';
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ choices: [{ message: { content: text }, finish_reason: 'stop' }] }));
    expect(await createNarratorProvider('nanogpt', config, fetcher).generate(request)).toBe(text);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://nano-gpt.com/api/v1/chat/completions');
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-key' });
    expect(JSON.parse(options?.body as string)).toEqual({ model: 'test-model', messages: [{ role: 'system', content: request.system }, ...request.messages], max_tokens: 2048, stream: false });
    expect(options).toMatchObject({ credentials: 'omit', redirect: 'error' });
  });
  it('sends Claude system separately and reads only text blocks', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'One' }, { type: 'text', text: 'Two' }] }));
    expect(await createNarratorProvider('claude', config, fetcher).generate({ ...request, maxTokens: 100 })).toBe('One\nTwo');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(options?.headers).toMatchObject({ 'x-api-key': 'test-key', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' });
    expect(JSON.parse(options?.body as string)).toEqual({ model: 'test-model', system: request.system, messages: request.messages, max_tokens: 100, stream: false });
  });
});

describe.each<ProviderId>(['nanogpt', 'claude'])('%s failure handling', id => {
  it.each([401, 403, 429, 500])('reports HTTP %s without echoing provider secrets', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('test-key secret prompt', { status }));
    await expect(createNarratorProvider(id, config, fetcher).generate(request)).rejects.toMatchObject({ status });
    await expect(createNarratorProvider(id, config, fetcher).generate(request)).rejects.not.toThrow('test-key');
  });
  it.each([{}, null, { content: [] }, { choices: [{ message: { content: '' } }] }])('rejects malformed or empty output %j', async data => {
    await expect(createNarratorProvider(id, config, vi.fn().mockResolvedValue(response(data))).generate(request)).rejects.toThrow('no usable text');
  });
  it('rejects truncated output', async () => {
    const data = id === 'claude' ? { stop_reason: 'max_tokens' } : { choices: [{ finish_reason: 'length' }] };
    await expect(createNarratorProvider(id, config, vi.fn().mockResolvedValue(response(data))).generate(request)).rejects.toThrow('truncated');
  });
  it('validates config before making a request', async () => {
    const fetcher = vi.fn();
    await expect(createNarratorProvider(id, { ...config, apiKey: '' }, fetcher).generate(request)).rejects.toThrow('API key');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('forwards cancellation and gives a safe error', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, options) => {
      controller.abort();
      expect(options?.signal?.aborted).toBe(true);
      throw new Error('test-key');
    });
    await expect(createNarratorProvider(id, config, fetcher).generate({ ...request, signal: controller.signal })).rejects.toThrow('cancelled');
  });
  it('sanitizes network and invalid JSON errors', async () => {
    await expect(createNarratorProvider(id, config, vi.fn().mockRejectedValue(new Error('test-key'))).generate(request)).rejects.toThrow('Check your connection');
    await expect(createNarratorProvider(id, config, vi.fn().mockResolvedValue(new Response('invalid'))).generate(request)).rejects.toThrow('Check your connection');
  });
});
