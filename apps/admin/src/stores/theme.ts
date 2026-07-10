import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";
export const STORAGE_KEY = "sd-theme-mode";

const read = (): ThemeMode => {
  if (typeof localStorage === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY) as ThemeMode;
  return raw === "light" || raw === "dark" ? raw : "system";
};
export const useThemeStore = create<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>((set) => ({
  mode: read(),
  setMode: (m) => {
    set({ mode: m });
    if (typeof document !== "undefined") document.documentElement.dataset.theme = m;
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, m);
  },
}));
export const setThemeMode = (m: ThemeMode) => useThemeStore.getState().setMode(m);
export const useThemeMode = (): [ThemeMode, (m: ThemeMode) => void] => [
  useThemeStore((s) => s.mode),
  useThemeStore((s) => s.setMode),
];
export const cycleThemeMode = (): ThemeMode => {
  const cur = useThemeStore.getState().mode;
  const next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";
  useThemeStore.getState().setMode(next);
  return next;
};
