/**
 * hooks/useTheme.ts
 * --------------------------------------------------------------------------
 * Light/dark toggle backed by localStorage + the `dark` class Tailwind's
 * `darkMode: ['class']` config expects on <html>. The class itself is set
 * synchronously by an inline script in layout.tsx (before React hydrates)
 * to avoid a flash of the wrong theme - this hook just keeps React state in
 * sync with that class and persists changes.
 */
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kbTheme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const current = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(current);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', next === 'dark');
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
