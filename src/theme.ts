export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_KEY = 'graded.theme';
export const themePreference = (value: string | null): ThemePreference =>
  value === 'light' || value === 'dark' ? value : 'system';

export function readTheme(): ThemePreference {
  try { return themePreference(localStorage.getItem(THEME_KEY)); } catch { return 'system'; }
}
export function resolvedTheme(preference: ThemePreference, deviceDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? (deviceDark ? 'dark' : 'light') : preference;
}
export function applyTheme(preference: ThemePreference, deviceDark: boolean) {
  const theme = resolvedTheme(preference, deviceDark);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#141e1a' : '#f3f0e7');
}
export function saveTheme(preference: ThemePreference): boolean {
  try { localStorage.setItem(THEME_KEY, preference); return true; } catch { return false; }
}
