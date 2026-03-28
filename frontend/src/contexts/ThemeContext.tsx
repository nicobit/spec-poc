import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

import { env } from '@/config/env';
import {
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  THEME_IDS,
  type ThemeId,
  type ThemeMode,
  isThemeId,
  isThemeMode,
} from '@/theme/themes';

interface ThemeContextType {
  darkMode: boolean;
  mode: ThemeMode;
  themeId: ThemeId;
  availableThemes: readonly ThemeId[];
  toggleDarkMode: () => void;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  setThemeId: (themeId: ThemeId) => void;
}

const THEME_STORAGE_KEY = 'theme.mode';
const THEME_ID_STORAGE_KEY = 'theme.id';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialThemeId(): ThemeId {
  const storedThemeId = localStorage.getItem(THEME_ID_STORAGE_KEY);
  if (isThemeId(storedThemeId)) {
    return storedThemeId;
  }

  return isThemeId(env.themeId) ? env.themeId : DEFAULT_THEME_ID;
}

function getInitialThemeMode(): ThemeMode {
  const storedThemeMode = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(storedThemeMode)) {
    return storedThemeMode;
  }

  return isThemeMode(env.themeMode) ? env.themeMode : DEFAULT_THEME_MODE;
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(getInitialThemeId);
  const [mode, setModeState] = useState<ThemeMode>(getInitialThemeMode);

  const setThemeId = useCallback((nextThemeId: ThemeId) => {
    setThemeIdState(nextThemeId);
    localStorage.setItem(THEME_ID_STORAGE_KEY, nextThemeId);
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    document.documentElement.dataset.mode = mode;

    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode, themeId]);

  const value = useMemo<ThemeContextType>(
    () => ({
      darkMode: mode === 'dark',
      mode,
      themeId,
      availableThemes: THEME_IDS,
      toggleDarkMode: toggleMode,
      toggleMode,
      setMode,
      setThemeId,
    }),
    [mode, setMode, setThemeId, themeId, toggleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
