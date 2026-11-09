import { useEffect, useState } from 'react';
import { applyAppearancePrefs, readAppearancePrefs } from '@/lib/appearance';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return readAppearancePrefs().themeMode ?? 'dark';
  });

  useEffect(() => {
    applyAppearancePrefs({ ...readAppearancePrefs(), themeMode: theme });
    try {
      const prefs = readAppearancePrefs();
      localStorage.setItem('sv-dispatch-settings-v1', JSON.stringify({ ...prefs, themeMode: theme }));
    } catch {}
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggle };
}
