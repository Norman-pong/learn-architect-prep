import { App, ConfigProvider, theme as antdTheme } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useMemo } from "react";

import { usePrefersDark } from "../hooks/usePrefersDark";
import { useThemeMode, type ThemeMode } from "../store/theme";

/**
 * The mode resolved from the user's `ThemeMode` plus OS preference.
 * This is what antd's algorithm accepts (it is binary).
 */
type ActualMode = "light" | "dark";

interface AppThemeProviderProps {
  children: React.ReactNode;
}

function resolveActualMode(mode: ThemeMode, prefersDark: boolean): ActualMode {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

/**
 * Wraps the entire admin app with antd's `ConfigProvider`, picking
 * `darkAlgorithm` / `defaultAlgorithm` based on the resolved mode.
 *
 * The provider is intentionally thin: it owns the algorithm decision
 * and exposes the raw `ThemeMode` (system/light/dark) via `useTheme()`
 * so callers can build their own UI (e.g. a three-way switch).
 *
 * The `algorithm` field is injected here — never inside a `as const`
 * factory — so antd's `ThemeConfig` keeps its mutable shape and
 * accepts the algorithm without a TS2322 readonly mismatch.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();

  const actualMode = resolveActualMode(mode, prefersDark);

  const themeConfig = useMemo(
    () => ({
      algorithm: actualMode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    }),
    [actualMode],
  );

  return (
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <App>{children}</App>
    </ConfigProvider>
  );
}

/**
 * Convenience hook for components that need the current `ThemeMode`
 * (e.g. to render the three-way switch icon). Re-exports the store
 * hook so callers don't need to know about the internal file layout.
 */
export function useTheme(): { mode: ThemeMode; prefersDark: boolean; actualMode: ActualMode } {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();
  return { mode, prefersDark, actualMode: resolveActualMode(mode, prefersDark) };
}
