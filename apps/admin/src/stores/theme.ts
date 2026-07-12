import { create } from "zustand";

export type ThemeMode = "system" | "light" | "dark";
export const STORAGE_KEY = "ap-theme";

const COOKIE_NAME = "ap-theme";
const COOKIE_MAX_AGE = 31536000;

const isBrowser = typeof document !== "undefined" && typeof window !== "undefined";

const readCookie = (): ThemeMode => {
  if (!isBrowser) return "system";
  const match = document.cookie.match(/(?:^|;\s*)ap-theme=([^;]+)/);
  const raw = match?.[1] as ThemeMode | undefined;
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
};

const writeCookie = (mode: ThemeMode) => {
  if (!isBrowser) return;
  document.cookie = `${COOKIE_NAME}=${mode}; SameSite=Lax; Path=/; Max-Age=${COOKIE_MAX_AGE}`;
};

const resolveSystemTheme = (): "light" | "dark" => {
  if (!isBrowser) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyDomTheme = (mode: ThemeMode) => {
  if (!isBrowser) return;
  const resolved = mode === "system" ? resolveSystemTheme() : mode;
  document.documentElement.dataset.theme = resolved;
};

let mediaHandler: ((e: MediaQueryListEvent) => void) | null = null;

const bindSystemListener = () => {
  if (!isBrowser || mediaHandler) return;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mediaHandler = () => {
    const state = useThemeStore.getState();
    if (state.mode === "system") {
      applyDomTheme("system");
    }
  };
  mql.addEventListener("change", mediaHandler);
};

export const initThemeMode = () => {
  if (!isBrowser) return;
  const mode = readCookie();
  useThemeStore.setState({ mode });
  applyDomTheme(mode);
  bindSystemListener();
};

export const useThemeStore = create<{
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}>((set) => ({
  mode: readCookie(),
  setMode: (m) => {
    set({ mode: m });
    applyDomTheme(m);
    writeCookie(m);
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
