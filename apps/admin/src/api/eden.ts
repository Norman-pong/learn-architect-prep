import { treaty } from "@elysiajs/eden";
import type { App } from "@archprep/server";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

/**
 * Typed Eden Treaty client for ArchPrep.
 * All API calls through this client are fully type-safe:
 * route paths, query params, request bodies, and response shapes
 * are derived from the server's Elysia App type.
 *
 * Usage:
 *   import { api } from './api/eden';
 *   const { data } = await api.health.get();
 *   const { data } = await api.knowledge.chapters.get();
 *
 * Token injection: when a user is logged in, set the token before calling:
 *   import { setAuthToken } from './api/eden';
 *   setAuthToken(accessToken);
 */

let authToken: string | null = localStorage.getItem("accessToken");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem("accessToken", token);
  else localStorage.removeItem("accessToken");
}

export function getAuthToken(): string | null {
  return authToken;
}

export function clearAuth() {
  authToken = null;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

/**
 * Typed API client. All route paths are derived from the server App type.
 */
export const api = treaty<App>(API_BASE, {
  headers: () => {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.authorization = `Bearer ${authToken}`;
    }
    return headers;
  },
});
