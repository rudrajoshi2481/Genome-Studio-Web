"use client";



import { themes, Theme } from "@/lib/themes";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemePreferences } from "@/lib/states/theme-preferences";
import { useEffect, useState } from "react";

export function ThemeSelector() {
  const { theme, setTheme } = useThemePreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {(Object.entries(themes)).map(([themeName, themeConfig]) => (
        <div
          key={themeName}
          className={cn(
            "relative flex flex-col gap-2 rounded-lg border-2 p-4 cursor-pointer hover:border-primary transition-colors",
            theme === themeName && "border-primary"
          )}
          onClick={() => setTheme(themeName as Theme)}
        >
          <div className="flex gap-1">
            {themeConfig.colors?.map((color: string, i: number) => (
              <div
                key={i}
                className="h-5 w-5 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <div>
            <h3 className="font-medium">{themeConfig.name}</h3>
            <p className="text-xs text-muted-foreground">{themeConfig.description}</p>
          </div>

          {theme === themeName && (
            <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />
          )}
        </div>
      ))}
    </div>
  );
}
