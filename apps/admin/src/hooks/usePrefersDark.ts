import { useEffect, useState } from "react";

/**
 * Tracks the user's OS-level color scheme preference.
 * Returns `true` when the system prefers dark mode, `false` otherwise.
 *
 * - SSR-safe: defaults to `false` when window/matchMedia is unavailable.
 * - Subscribes to live changes via `MediaQueryListEvent` so the value
 *   updates when the user toggles their OS theme while the app is open.
 */
export function usePrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, []);

  return prefersDark;
}
