export const THEME_IDS = ['classic', 'cyber', 'commerce'] as const;
export const THEME_MODES = ['light', 'dark'] as const;

export type ThemeId = (typeof THEME_IDS)[number];
export type ThemeMode = (typeof THEME_MODES)[number];

export const DEFAULT_THEME_ID: ThemeId = 'cyber';
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return !!value && THEME_IDS.includes(value as ThemeId);
}

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return !!value && THEME_MODES.includes(value as ThemeMode);
}
