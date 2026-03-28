"use client";

import { Laptop, MoonStar, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore } from "@/store/theme-store";

const themeOptions = [
  { value: "light" as const, icon: SunMedium, label: "Light" },
  { value: "dark" as const, icon: MoonStar, label: "Dark" },
  { value: "system" as const, icon: Laptop, label: "System" },
];

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white p-0.5 shadow-sm shadow-black/5 dark:border-border/60 dark:bg-background/50 dark:shadow-black/10">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.value}
            size="icon"
            variant={theme === option.value ? "secondary" : "ghost"}
            onClick={() => setTheme(option.value)}
            aria-label={`${option.label} theme`}
            className="h-9 w-9 rounded-xl"
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );
}
