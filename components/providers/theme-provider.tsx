'use client';

import { useThemePreferences } from '@/lib/states/theme-preferences';
import { themes, Theme } from '@/lib/themes';
import { useEffect, useLayoutEffect } from 'react';

// Create a no-op version of useLayoutEffect for SSR
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Keep track of the current theme to avoid unnecessary re-renders
let currentAppliedTheme: Theme | null = null;

// Function to apply theme and its CSS variables
function applyTheme(themeName: Theme) {
  if (typeof window === 'undefined') return;
  
  // Skip if the theme is already applied
  if (currentAppliedTheme === themeName) return;
  currentAppliedTheme = themeName;

  // Use a single RAF call to minimize layout thrashing
  requestAnimationFrame(() => {
    // Apply theme class first for immediate visual feedback
    document.documentElement.classList.remove(...Object.keys(themes));
    document.documentElement.classList.add(themeName);

    // Apply theme colors to CSS variables
    const themeConfig = themes[themeName];
    if (!themeConfig) return;

    // Prepare all CSS variables at once
    const style = document.documentElement.style;
    
    // Batch all DOM operations
    Object.entries(themeConfig)
      .filter(([key, value]) => typeof value === 'string' && !key.includes('gradient'))
      .forEach(([key, value]) => {
        style.setProperty(`--${key}`, value as string);
      });
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemePreferences();

  // Apply theme immediately during client-side navigation
  useIsomorphicLayoutEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || theme;
    applyTheme(savedTheme);
  }, [theme]); // Add theme dependency to ensure initial value is correct

  // Handle theme changes
  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return <>{children}</>;
}
