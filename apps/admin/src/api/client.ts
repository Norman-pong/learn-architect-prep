const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

const ACCESS_TOKEN_KEY = "ap-access-token";
const REFRESH_TOKEN_KEY = "ap-refresh-token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function clearAuth(): void {
  clearTokens();
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorizedCallback = callback;
}

export function triggerUnauthorized(): void {
  clearTokens();
  onUnauthorizedCallback?.();
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.accessToken === "string") {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function doRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function fetchWithAuth(input: string, init?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${input}`, { ...init, headers });

  if (response.status !== 401) {
    return response;
  }

  const newToken = await doRefresh();
  if (!newToken) {
    triggerUnauthorized();
    return response;
  }

  headers.set("Authorization", `Bearer ${newToken}`);
  return fetch(`${API_BASE_URL}${input}`, { ...init, headers });
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(path, init);

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}));
    if (!isRecord(data)) {
      throw new Error(`请求失败: ${response.status}`);
    }
    throw new Error(typeof data.error === "string" ? data.error : `请求失败: ${response.status}`);
  }

  return response.json();
}

export async function sendCode(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/send-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}));
    if (!isRecord(data)) {
      throw new Error("发送验证码失败");
    }
    throw new Error(typeof data.error === "string" ? data.error : "发送验证码失败");
  }
}

export async function verifyCode(
  email: string,
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!response.ok) {
    const data: unknown = await response.json().catch(() => ({}));
    if (!isRecord(data)) {
      throw new Error("登录失败");
    }
    if (typeof data.error === "string") {
      throw new Error(data.error);
    }
    throw new Error("登录失败");
  }

  return response.json();
}

export function getMe(): Promise<{ id: string; email: string }> {
  return apiRequest("/auth/me");
}
