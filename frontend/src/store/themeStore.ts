'use client';

/**
 * Theme Store — manages dark/light mode toggle.
 * Light mode uses a sophisticated beige/warm palette, not plain white.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'dark',

      toggleTheme: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: next });
        applyTheme(next);
      },

      setTheme: (mode) => {
        set({ mode });
        applyTheme(mode);
      },
    }),
    {
      name: 'neuralflow-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.mode);
        }
      },
    }
  )
);

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export default useThemeStore;
