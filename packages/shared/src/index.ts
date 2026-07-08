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

export interface AIConfig {
  id: number;
  userId: number;
  provider: Provider;
  apiKey: string; // encrypted
  baseUrl?: string;
  model?: string;
  createdAt: string;
  updatedAt: string;
}
