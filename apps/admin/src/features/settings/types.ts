import type { Provider } from "@archprep/shared";

export interface AIConfigFormData {
  provider: Provider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface AIConfigResponse {
  id: string;
  userId: string;
  provider: Provider;
  model?: string;
  baseUrl?: string;
  updatedAt: string;
}

export interface SummaryPeriod {
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}

export interface AICostSummary {
  today: SummaryPeriod;
  thisWeek: SummaryPeriod;
  total: SummaryPeriod;
}

export interface FeatureUsage {
  feature: string;
  provider: string;
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costEstimate: number;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
}
