'use client';

import { ThemeSelector } from './theme-selector';

export function AppearanceSettings() {
  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the application
        </p>
      </div>
      <ThemeSelector />
    </section>
  );
}
