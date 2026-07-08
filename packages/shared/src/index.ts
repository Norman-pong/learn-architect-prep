export interface User {
  id: number;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: "ok" | "error";
}

export interface HealthCheckResponse {
  status: "ok";
}

export type Provider = "openai" | "anthropic" | "deepseek" | "minimax" | "kimi" | "custom";

/**
 * Public AI config - safe to share with the frontend (API responses).
 * The encrypted API key is server-side only and never appears here.
 * Server-side code uses its own internal type that includes the key.
 */
export interface AIConfig {
  id: string;
  userId: string;
  provider: Provider;
  baseUrl?: string;
  model?: string;
  updatedAt: string;
}
