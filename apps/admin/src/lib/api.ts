import { treaty } from "@elysiajs/eden";
import type { App } from "@archprep/server";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

const ACCESS_TOKEN_KEY = "ap-access-token";
const REFRESH_TOKEN_KEY = "ap-refresh-token";

export function getAuthToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/**
 * Typed Eden Treaty client for ArchPrep.
 * All API calls through this client are fully type-safe:
 * route paths, query params, request bodies, and response shapes
 * are derived from the server's Elysia App type.
 *
 * Usage:
 *   const { data, error } = await api.knowledge.chapters.get()
 *   const { data } = await api.quiz.questions.get({ query: { chapter: 'ch01' } })
 */
// @ts-expect-error Elysia monorepo type constraint
export const api = treaty<App>(API_BASE, {
  headers: () => {
    const headers: Record<string, string> = {};
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      headers.authorization = `Bearer ${token}`;
    }
    return headers;
  },
});

/**
 * Extract a human-readable error message from an Eden Treaty error response.
 * Eden errors carry either a top-level `{ error: string }` or a validation
 * shape with a `message` field.
 */
export function getEdenError(error: unknown, fallback: string): string {
  if (typeof error !== "object" || error === null) return fallback;
  const value = (error as Record<string, unknown>).value;
  if (typeof value !== "object" || value === null) return fallback;
  const record = value as Record<string, unknown>;
  if (typeof record.error === "string") return record.error;
  if (typeof record.message === "string") return record.message;
  return fallback;
}

/**
 * Lightweight typed fetch helper for endpoints not yet covered by Eden Treaty,
 * or for simple raw-fetch routes. Adds the bearer token from localStorage when present.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = new Headers(init?.headers);
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}));
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : `请求失败 (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
