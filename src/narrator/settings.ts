import type { ProviderConfig, ProviderId } from './types';

export type NarratorSettings = { provider: ProviderId; providers: Record<ProviderId, ProviderConfig> };
export const SETTINGS_KEY = 'graded.narrator.v1';
export function defaultSettings(): NarratorSettings {
  return { provider: 'nanogpt', providers: {
    nanogpt: { apiKey: '', model: 'deepseek/deepseek-v3.2' },
    claude: { apiKey: '', model: 'claude-sonnet-4-5' },
  } };
}

function config(value: unknown, fallback: ProviderConfig): ProviderConfig {
  if (!value || typeof value !== 'object') return fallback;
  const item = value as Record<string, unknown>;
  return { apiKey: typeof item.apiKey === 'string' ? item.apiKey : '',
    model: typeof item.model === 'string' && item.model.trim() ? item.model : fallback.model };
}

// Storage is accessed lazily: blocked storage must not prevent the app loading.
export function loadSettings(storage: Pick<Storage, 'getItem'> = localStorage): NarratorSettings {
  const defaults = defaultSettings();
  const raw = storage.getItem(SETTINGS_KEY);
  if (!raw) return defaults;
  try {
    const data = JSON.parse(raw);
    return { provider: data?.provider === 'claude' ? 'claude' : 'nanogpt', providers: {
      nanogpt: config(data?.providers?.nanogpt, defaults.providers.nanogpt),
      claude: config(data?.providers?.claude, defaults.providers.claude),
    } };
  } catch { return defaults; }
}

export function saveSettings(settings: NarratorSettings, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function clearSettings(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  storage.removeItem(SETTINGS_KEY);
}
