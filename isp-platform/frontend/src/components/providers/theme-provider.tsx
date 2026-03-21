"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useThemeStore, type ThemeMode } from "@/store/theme-store";

const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
}

function resolveThemeValue(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return resolveSystemTheme();
  }
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => resolveSystemTheme());

  const resolvedTheme = useMemo(() => {
    return theme === "system" ? systemTheme : resolveThemeValue(theme);
  }, [systemTheme, theme]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia(SYSTEM_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    body.classList.remove("light", "dark");
    body.classList.add(resolvedTheme);
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    body.dataset.theme = resolvedTheme;
    body.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  return <>{children}</>;
}
