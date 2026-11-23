"use client";

import * as React from "react";
import { Toaster } from "sonner";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "orthocase-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

function emitThemeChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Ignore storage access errors (e.g. private browsing)
  }
  return "system";
}

function getResolvedThemeSnapshot(): ResolvedTheme {
  const stored = getStoredTheme();
  return stored === "system" ? getSystemTheme() : stored;
}

function subscribeTheme(callback: () => void) {
  listeners.add(callback);

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => callback();
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      callback();
    }
  };

  mediaQuery.addEventListener("change", handleMediaChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    listeners.delete(callback);
    mediaQuery.removeEventListener("change", handleMediaChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

let transitionTimer: number | undefined;

function applyThemeToDocument(resolved: ResolvedTheme, animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transition");
    window.clearTimeout(transitionTimer);
    transitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 250);
  }
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore<Theme>(
    subscribeTheme,
    getStoredTheme,
    () => "system",
  );
  const resolvedTheme = React.useSyncExternalStore<ResolvedTheme>(
    subscribeTheme,
    getResolvedThemeSnapshot,
    () => "light",
  );

  React.useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage write errors
    }
    const resolved = next === "system" ? getSystemTheme() : next;
    applyThemeToDocument(resolved, true);
    emitThemeChange();
  }, []);

  const toggleTheme = React.useCallback(() => {
    const currentResolved = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(currentResolved === "dark" ? "light" : "dark");
  }, [setTheme]);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        theme={resolvedTheme}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
