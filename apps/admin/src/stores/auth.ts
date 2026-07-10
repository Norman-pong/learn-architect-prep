import { create } from "zustand";
import { getAuthToken, setAuthToken, clearAuth } from "@/lib/api";

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  reset: () => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getAuthToken(),
  isAuthenticated: !!getAuthToken(),
  setAuth: (user, token) => {
    setAuthToken(token);
    set({ user, token, isAuthenticated: true });
  },
  reset: () => {
    clearAuth();
    set({ user: null, token: null, isAuthenticated: false });
  },
  setToken: (token) => {
    setAuthToken(token);
    set({ token, isAuthenticated: !!token });
  },
}));

export function useAuthUser(): User | null {
  return useAuthStore((s) => s.user);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}
