import { useState } from 'react';
import { clearSettings, defaultSettings, loadSettings, saveSettings } from './settings';
import type { ProviderId } from './types';
import './settings.css';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [initial] = useState(() => {
    try { return { settings: loadSettings(), error: '' }; }
    catch { return { settings: defaultSettings(), error: 'Browser storage is unavailable. Settings cannot be loaded or saved.' }; }
  });
  const [settings, setSettings] = useState(initial.settings);
  const [error, setError] = useState(initial.error);
  const [status, setStatus] = useState('');
  const selected = settings.providers[settings.provider];
  function update(field: 'model' | 'apiKey', value: string) {
    setStatus('');
    setSettings({ ...settings, providers: { ...settings.providers,
      [settings.provider]: { ...selected, [field]: value },
    } });
  }
  return <section className="narrator-settings" aria-labelledby="narrator-settings-title">
    <h1 id="narrator-settings-title">Narrator settings</h1>
    <p>Choose the AI that narrates your story. Game rules and stats remain controlled by GRADED.</p>
    <p id="key-help">Keys are saved in this browser's local storage, unencrypted and accessible to scripts on this site. Requests go directly to your chosen provider. Use your own key on a trusted device.</p>
    <form onSubmit={event => {
      event.preventDefault(); setError(''); setStatus('');
      try {
        saveSettings({ ...settings, providers: {
          nanogpt: { apiKey: settings.providers.nanogpt.apiKey.trim(), model: settings.providers.nanogpt.model.trim() },
          claude: { apiKey: settings.providers.claude.apiKey.trim(), model: settings.providers.claude.model.trim() },
        } });
        setStatus('Narrator settings saved.');
      } catch { setError('Could not save settings. Allow browser storage and try again.'); }
    }}>
      <label htmlFor="provider">Provider</label>
      <select id="provider" value={settings.provider} onChange={event => {
        setSettings({ ...settings, provider: event.target.value as ProviderId }); setStatus('');
      }}><option value="nanogpt">NanoGPT</option><option value="claude">Claude API</option></select>
      <label htmlFor="model">Model ID</label>
      <input id="model" required value={selected.model} onChange={event => update('model', event.target.value)} list={settings.provider === 'nanogpt' ? 'nano-models' : undefined} />
      <datalist id="nano-models"><option value="deepseek/deepseek-v3.2">DeepSeek 3.2</option><option value="zai-org/glm-4.6">GLM 4.6</option></datalist>
      <p>Enter a model ID available to your provider account.</p>
      <label htmlFor="api-key">{settings.provider === 'nanogpt' ? 'NanoGPT' : 'Claude'} API key</label>
      <input id="api-key" type="password" autoComplete="off" spellCheck={false} aria-describedby="key-help" value={selected.apiKey} onChange={event => update('apiKey', event.target.value)} />
      <p>Leave the key blank to remove it. Each provider keeps its own key and model.</p>
      <div className="settings-actions"><button type="submit" disabled={!selected.model.trim()}>Save settings</button>
        <button type="button" onClick={() => {
          setError(''); setStatus('');
          try { clearSettings(); setSettings(defaultSettings()); setStatus('All narrator keys and settings removed.'); }
          catch { setError('Could not remove saved settings. Check browser storage permissions.'); }
        }}>Clear saved keys and settings</button>
        <button type="button" onClick={onClose}>Back to game</button></div>
    </form>
    <p role="status">{status}</p>{error && <p role="alert">{error}</p>}
  </section>;
}
