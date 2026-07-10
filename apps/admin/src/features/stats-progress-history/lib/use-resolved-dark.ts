import { usePrefersDark } from "@/hooks/usePrefersDark";
import { useThemeMode } from "@/stores/theme";

export function useResolvedDark(): boolean {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();
  const resolved: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  return resolved === "dark";
}
