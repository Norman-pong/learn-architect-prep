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

/**
 * Section keys for a thesis paper (FR-WR-05).
 * The order here defines the order shown in the editor and exported Markdown.
 */
export const THESIS_SECTIONS = [
  "summary",
  "background",
  "solution",
  "reflection",
  "conclusion",
] as const;

export type ThesisSectionKey = (typeof THESIS_SECTIONS)[number];

export type ThesisSections = Record<ThesisSectionKey, string>;

/**
 * Recommended word range per section, sourced from docs/reference/调研报告.md §4.3.
 * The lower bound marks "below minimum"; the upper bound marks "above maximum".
 */
export const THESIS_SECTION_TARGETS: Record<
  ThesisSectionKey,
  { min: number; max: number; label: string }
> = {
  summary: { min: 300, max: 400, label: "摘要" },
  background: { min: 400, max: 600, label: "项目背景" },
  solution: { min: 1000, max: 1400, label: "技术方案" },
  reflection: { min: 200, max: 400, label: "效果反思" },
  conclusion: { min: 100, max: 200, label: "结论" },
};

/** Total thesis word count target: 2000–3000 (per PRD §1.1). */
export const THESIS_TOTAL_TARGET = { min: 2000, max: 3000 } as const;

/**
 * Public writing record (response shape from the backend).
 * Sectioned content is JSON-encoded inside the DB's `content` column
 * so the schema stays stable while preserving structure on the wire.
 */
export interface Writing {
  id: string;
  userId: string;
  title: string;
  content: ThesisSections;
  aiScore?: AiScoreSummary | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lightweight summary used by the list endpoint to avoid sending full content.
 * `wordCount` is precomputed server-side.
 */
export interface WritingSummary {
  id: string;
  title: string;
  wordCount: number;
  updatedAt: string;
}

/** AI score payload (FR-WR-03; opaque here until the score route lands). */
export interface AiScoreSummary {
  total?: number;
  scoredAt?: string;
  [dimension: string]: number | string | undefined;
}

/** Body accepted by POST /api/writings — `id` present means update. */
export interface WritingUpsertBody {
  id?: string;
  title: string;
  sections: ThesisSections;
}
