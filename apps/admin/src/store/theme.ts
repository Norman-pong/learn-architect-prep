import { useEffect, useState } from "react";

/**
 * Theme mode store for the admin app.
 *
 * Three modes are supported:
 *  - `"system"`: follow the OS prefers-color-scheme (resolved at render time)
 *  - `"light"`:  force light antd theme
 *  - `"dark"`:   force dark antd theme
 *
 * Persistence: the user's choice is mirrored to `localStorage` under
 * `sd-theme-mode` and to `document.documentElement.dataset.theme` so
 * CSS can react to it (see `index.css` `[data-theme="dark"]` rules).
 *
 * The store is intentionally tiny and framework-agnostic — antd's
 * `darkAlgorithm` / `defaultAlgorithm` are NOT injected here; the
 * `AppThemeProvider` resolves the stored mode + system preference
 * into the algorithm passed to `ConfigProvider`.
 */

export type ThemeMode = "system" | "light" | "dark";

export const STORAGE_KEY = "sd-theme-mode";

function readStoredMode(): ThemeMode {
  if (typeof localStorage === "undefined") return "system";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* localStorage disabled — fall through */
  }
  return "system";
}

let current: ThemeMode = readStoredMode();
const subscribers = new Set<(m: ThemeMode) => void>();

function emit(next: ThemeMode): void {
  current = next;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next;
  }
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private-mode failures */
    }
  }
  for (const cb of subscribers) cb(next);
}

/** Imperatively set the theme mode and persist it. */
export function setThemeMode(next: ThemeMode): void {
  if (next === current) return;
  emit(next);
}

/** Cycle to the next mode in the order: system -> light -> dark -> system. */
export function cycleThemeMode(): ThemeMode {
  const next: ThemeMode = current === "system" ? "light" : current === "light" ? "dark" : "system";
  emit(next);
  return next;
}

/** Synchronously read the current stored mode (no subscription). */
export function getThemeMode(): ThemeMode {
  return current;
}

/** Sync the DOM `data-theme` attribute with the stored mode. Call once on boot. */
export function bootstrapThemeMode(): void {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = current;
  }
}

/**
 * React hook subscribing to theme mode changes.
 * Returns `[mode, setMode]` — `setMode` is a stable imperative setter.
 */
export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const [mode, setMode] = useState<ThemeMode>(current);
  useEffect(() => {
    const cb = (m: ThemeMode) => setMode(m);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);
  return [mode, setThemeMode];
}
