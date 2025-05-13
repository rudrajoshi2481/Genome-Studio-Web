import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, themes } from '@/lib/themes';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemePreferences = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light' as Theme,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-preferences',
    }
  )
);
