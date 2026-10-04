# Narrator providers

Settings are available from the game's **Narrator settings** button. Save a provider,
model ID and personal API key. Keys remain in this origin's localStorage until
removed; they are not encrypted. Never place shared/server keys in this app.

```ts
import { loadSettings, createNarratorProvider } from './narrator';

const settings = loadSettings(); // May throw if browser storage is blocked.
const provider = createNarratorProvider(settings.provider, settings.providers[settings.provider]);
const text = await provider.generate({
  system: 'Narrate the supplied scene. Do not decide game state.',
  messages: [{ role: 'user', content: 'The engine resolved the action: ...' }],
  maxTokens: 2048,
  signal: new AbortController().signal,
});
```

The interface returns raw text, including any plain structured proposal block.
It does not parse or apply proposals, match lore, or implement scene mode. Those
remain milestone 3 integration work. No provider-specific tool calling is used.
Requests have a two-minute timeout and are not retried automatically to avoid
duplicate charges. Truncated responses are rejected rather than used as proposals.

NanoGPT uses its [OpenAI-compatible chat endpoint](https://docs.nano-gpt.com/api-reference/endpoint/chat-completion).
Claude uses the [Messages API](https://platform.claude.com/docs/en/api/overview),
including the browser opt-in header used by the official Anthropic SDK. Model IDs
are editable because provider availability varies. DeepSeek 3.2 and GLM 4.6 are
suggested NanoGPT models; scene prompt tuning remains separate work.

Tests use mocked HTTP responses and browser storage. Live requests require the
user's keys and provider balance; no live credentials are needed for build/tests.
