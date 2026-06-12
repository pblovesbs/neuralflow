'use client';

/**
 * ThemeInitializer — Client component that applies the persisted theme on mount.
 * Prevents flash of wrong theme on page load.
 */

import { useEffect } from 'react';
import useThemeStore from '@/store/themeStore';

export function ThemeInitializer() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [mode]);

  return null;
}
