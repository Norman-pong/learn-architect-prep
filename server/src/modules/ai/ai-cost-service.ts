import { getDb } from "../../db";

/**
 * Per-provider pricing in USD per 1M tokens.
 * Falls back to "custom" when provider not listed.
 */
export const PROVIDER_PRICING: Record<string, { input: number; output: number }> = {
  openai: { input: 2.5, output: 15.0 },
  anthropic: { input: 3.0, output: 15.0 },
  deepseek: { input: 0.14, output: 0.28 },
  minimax: { input: 0.3, output: 1.2 },
  kimi: { input: 0.95, output: 4.0 },
  custom: { input: 2.0, output: 2.0 },
};

function getPricing(provider: string) {
  return PROVIDER_PRICING[provider] ?? PROVIDER_PRICING.custom;
}

function computeCost(provider: string, inputTokens: number, outputTokens: number): number {
  const p = getPricing(provider);
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
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

export interface CostSummary {
  today: { inputTokens: number; outputTokens: number; costEstimate: number };
  thisWeek: { inputTokens: number; outputTokens: number; costEstimate: number };
  total: { inputTokens: number; outputTokens: number; costEstimate: number };
}

interface UsageStatsRow {
  feature: string;
  provider: string;
  model: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  cost_estimate: number;
}

/**
 * Group AI usage by feature (and provider/model) for the given user.
 */
export function getUsageStats(userId: string): FeatureUsage[] {
  const db = getDb();
  const rows = db
    .query<UsageStatsRow, [string]>(
      `SELECT feature, provider, model,
              COUNT(*) as calls,
              SUM(input_tokens) as input_tokens,
              SUM(output_tokens) as output_tokens,
              SUM(cost_estimate) as cost_estimate
       FROM ai_usage
       WHERE user_id = ?
       GROUP BY feature, provider, model
       ORDER BY feature, provider`,
    )
    .all(userId);

  return rows.map((r) => ({
    feature: r.feature,
    provider: r.provider,
    model: r.model,
    calls: r.calls,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    costEstimate: r.cost_estimate,
  }));
}

function round(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

/**
 * Summarise AI usage for today, this week, and all time.
 * Uses the stored cost_estimate (which was computed at insertion time
 * with the then-current pricing) so that historical records stay
 * consistent even if the price table changes later.
 */
export function getCostSummary(userId: string): CostSummary {
  const db = getDb();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());

  const todayIso = todayStart.toISOString();
  const weekIso = weekStart.toISOString();

  interface UsageRow {
    created_at: string;
    input_tokens: number;
    output_tokens: number;
    cost_estimate: number;
  }

  const all = db
    .query<UsageRow, [string]>(
      `SELECT created_at, input_tokens, output_tokens, cost_estimate
       FROM ai_usage
       WHERE user_id = ?`,
    )
    .all(userId);

  const today = { inputTokens: 0, outputTokens: 0, costEstimate: 0 };
  const thisWeek = { inputTokens: 0, outputTokens: 0, costEstimate: 0 };
  const total = { inputTokens: 0, outputTokens: 0, costEstimate: 0 };

  for (const row of all) {
    const t = row.input_tokens;
    const o = row.output_tokens;
    const c = row.cost_estimate;

    total.inputTokens += t;
    total.outputTokens += o;
    total.costEstimate += c;

    if (row.created_at >= todayIso) {
      today.inputTokens += t;
      today.outputTokens += o;
      today.costEstimate += c;
    }
    if (row.created_at >= weekIso) {
      thisWeek.inputTokens += t;
      thisWeek.outputTokens += o;
      thisWeek.costEstimate += c;
    }
  }

  // Round to 6 decimal places for clean display
  return {
    today: {
      inputTokens: today.inputTokens,
      outputTokens: today.outputTokens,
      costEstimate: round(today.costEstimate),
    },
    thisWeek: {
      inputTokens: thisWeek.inputTokens,
      outputTokens: thisWeek.outputTokens,
      costEstimate: round(thisWeek.costEstimate),
    },
    total: {
      inputTokens: total.inputTokens,
      outputTokens: total.outputTokens,
      costEstimate: round(total.costEstimate),
    },
  };
}

/**
 * Recompute cost for a single usage row using the current pricing table.
 * Useful when the user overrides unit prices in settings.
 */
export function recomputeCost(provider: string, inputTokens: number, outputTokens: number): number {
  return computeCost(provider, inputTokens, outputTokens);
}
