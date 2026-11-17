import { useState } from 'react';
import { THEMES, ThemeId, getRandomTheme } from '../types/theme';

const THEME_STORAGE_KEY = 'QUIZ_INAGATA_THEME';

export function useThemePreference() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES[saved]) {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
    const initialRandom = getRandomTheme();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, initialRandom);
    } catch {
      // ignore storage errors
    }
    return initialRandom;
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const selectTheme = (newTheme: ThemeId) => {
    setThemeId(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
  };

  const currentTheme = THEMES[themeId] || THEMES.desert;

  return {
    themeId,
    currentTheme,
    isThemeModalOpen,
    setIsThemeModalOpen,
    selectTheme,
  };
}
