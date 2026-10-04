import { describe, expect, it } from 'vitest';
import { clearSettings, defaultSettings, loadSettings, saveSettings, SETTINGS_KEY } from './settings';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

describe('narrator settings', () => {
  it('persists provider selection and separate keys/models across reloads', () => {
    const storage = memoryStorage();
    const settings = defaultSettings();
    settings.provider = 'claude';
    settings.providers.nanogpt = { apiKey: 'nano-key', model: 'zai-org/glm-4.6' };
    settings.providers.claude.apiKey = 'claude-key';
    saveSettings(settings, storage);
    expect(loadSettings(storage)).toEqual(settings);
    settings.providers.claude.apiKey = '';
    saveSettings(settings, storage);
    expect(loadSettings(storage).providers.claude.apiKey).toBe('');
    expect(loadSettings(storage).providers.nanogpt.apiKey).toBe('nano-key');
    storage.setItem('game-save', 'keep');
    clearSettings(storage);
    expect(loadSettings(storage)).toEqual(defaultSettings());
    expect(storage.getItem('game-save')).toBe('keep');
  });
  it.each(['bad json', 'null', '[]', '{"provider":"unknown","providers":{"claude":{"apiKey":123,"model":[]}}}'])('recovers invalid persisted data: %s', raw => {
    const storage = memoryStorage(); storage.setItem(SETTINGS_KEY, raw);
    expect(loadSettings(storage)).toEqual(defaultSettings());
  });
  it('surfaces blocked storage for the screen to report instead of claiming success', () => {
    const fail = () => { throw new Error('blocked'); };
    expect(() => loadSettings({ getItem: fail })).toThrow('blocked');
    expect(() => saveSettings(defaultSettings(), { setItem: fail })).toThrow('blocked');
    expect(() => clearSettings({ removeItem: fail })).toThrow('blocked');
  });
});
