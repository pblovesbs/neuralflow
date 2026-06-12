'use client';

/**
 * Mode Store — manages Standard/Builder mode toggle.
 * Persists choice to localStorage and sets a cookie for middleware auto-redirect.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Mode = 'standard' | 'builder' | null;

interface ModeStore {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
}

const useModeStore = create<ModeStore>()(
  persist(
    (set, get) => ({
      mode: null,

      setMode: (mode) => {
        set({ mode });
        // Set a cookie so Next.js middleware can read it for auto-redirect
        if (typeof document !== 'undefined' && mode) {
          document.cookie = `nf-mode=${mode};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
        }
      },

      toggleMode: () => {
        const current = get().mode;
        const next: Mode = current === 'standard' ? 'builder' : 'standard';
        get().setMode(next);
      },
    }),
    {
      name: 'neuralflow-mode',
    }
  )
);

export default useModeStore;
