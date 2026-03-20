"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function ThemeSync() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return null;
}
