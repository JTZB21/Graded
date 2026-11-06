import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { applyTheme, readTheme, resolvedTheme, saveTheme, THEME_KEY, themePreference } from './theme';
import { ThemeSettings, ThemeToggle } from './ui/ThemeSettings';

afterEach(() => vi.unstubAllGlobals());
describe('appearance preferences', () => {
  it('follows the device unless an explicit mode is chosen', () => {
    expect(resolvedTheme('system', true)).toBe('dark');
    expect(resolvedTheme('system', false)).toBe('light');
    expect(resolvedTheme('light', true)).toBe('light');
    expect(resolvedTheme('dark', false)).toBe('dark');
    expect(themePreference('invalid')).toBe('system');
  });
  it('persists separately from game saves and reads the selection back', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
    expect(readTheme()).toBe('system'); expect(saveTheme('dark')).toBe(true);
    expect(values.get(THEME_KEY)).toBe('dark'); expect(readTheme()).toBe('dark');
    expect([...values.keys()]).toEqual(['graded.theme']);
  });
  it('keeps theme selection usable when storage is unavailable', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
    expect(readTheme()).toBe('system'); expect(saveTheme('dark')).toBe(false);
  });
  it('applies color scheme, root theme and Android toolbar together', () => {
    const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
    const setAttribute = vi.fn();
    vi.stubGlobal('document', { documentElement: root, querySelector: () => ({ setAttribute }) });
    applyTheme('dark', false);
    expect(root.dataset.theme).toBe('dark'); expect(root.style.colorScheme).toBe('dark');
    expect(setAttribute).toHaveBeenLastCalledWith('content', '#141e1a');
    applyTheme('light', true); expect(root.dataset.theme).toBe('light');
  });
  it('renders labelled, keyboard-native theme choices and a pressed-state toggle', () => {
    const html = renderToStaticMarkup(createElement(ThemeSettings));
    expect(html).toContain('Color theme'); expect(html).toContain('Device');
    expect(html).toContain('aria-pressed="true"');
    expect(renderToStaticMarkup(createElement(ThemeToggle))).toContain('aria-label="Dark mode"');
  });
});
