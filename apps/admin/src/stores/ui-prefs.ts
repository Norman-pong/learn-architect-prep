import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  recentSearches: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const MAX_RECENT = 10;

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  recentSearches: [],
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  addRecentSearch: (q) =>
    set((s) => ({
      recentSearches: [q, ...s.recentSearches.filter((x) => x !== q)].slice(0, MAX_RECENT),
    })),
  clearRecentSearches: () => set({ recentSearches: [] }),
}));
