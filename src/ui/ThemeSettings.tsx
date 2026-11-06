import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { applyTheme, readTheme, resolvedTheme, saveTheme, THEME_KEY, themePreference, type ThemePreference } from '../theme';

const ThemeContext = createContext({ preference: 'system' as ThemePreference, dark: false, saved: true, change: (_value: ThemePreference) => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readTheme);
  const [deviceDark, setDeviceDark] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches);
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const media = matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setDeviceDark(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => { applyTheme(preference, deviceDark); }, [preference, deviceDark]);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === THEME_KEY || e.key === null) { setPreference(themePreference(e.newValue)); setSaved(true); } };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const change = (value: ThemePreference) => {
    setPreference(value); applyTheme(value, deviceDark); setSaved(saveTheme(value));
  };
  return <ThemeContext.Provider value={{ preference, dark: resolvedTheme(preference, deviceDark) === 'dark', saved, change }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle() {
  const { dark, change } = useContext(ThemeContext);
  return <button className="theme-toggle" aria-label="Dark mode" aria-pressed={dark} onClick={() => change(dark ? 'light' : 'dark')}>
    <span aria-hidden="true">{dark ? '☾' : '☀'}</span><span>{dark ? 'Dark' : 'Light'}</span>
  </button>;
}
export function ThemeSettings() {
  const { preference, saved, change } = useContext(ThemeContext);
  return <section className="card appearance">
    <p className="eyebrow">Make yourself at home</p>
    <h3>Appearance</h3>
    <p className="muted">Choose a theme, or follow your device. This setting applies to every life on this device.</p>
    <div className="theme-options" role="group" aria-label="Color theme">
      {(['light', 'dark', 'system'] as const).map(value => <button key={value} className={`theme-choice ${value}${preference === value ? ' selected' : ''}`} aria-pressed={preference === value} onClick={() => change(value)}>
        <span className="theme-swatch" aria-hidden="true"><i /><i /><i /></span>
        {value === 'system' ? 'Device' : value === 'dark' ? 'Dark' : 'Light'}
      </button>)}
    </div>
    <p className="hint" role="status">{saved ? 'Your choice is remembered automatically.' : 'Theme changed for this session. Device storage is unavailable, so it could not be saved.'}</p>
  </section>;
}
