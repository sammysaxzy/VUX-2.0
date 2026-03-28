"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type PersistOptions, type PersistStorage } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

type ThemeState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const storage: PersistStorage<ThemeState> | undefined =
  typeof window === "undefined" ? undefined : createJSONStorage(() => localStorage);

const persistOptions: PersistOptions<ThemeState> = {
  name: "isp-theme",
  ...(storage ? { storage } : {}),
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => {
          const fallback =
            typeof window === "undefined"
              ? "light"
              : window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
          const next: ThemeMode =
            state.theme === "system"
              ? (fallback === "dark" ? "light" : "dark")
              : state.theme === "light"
              ? "dark"
              : "light";
          return { theme: next };
        }),
    }),
    persistOptions,
  ),
);
