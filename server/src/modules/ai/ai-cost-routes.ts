import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getUsageStats, getCostSummary } from "./ai-cost-service";

const ErrorResponse = t.Object({ error: t.String() });

const FeatureUsageItem = t.Object({
  feature: t.String(),
  provider: t.String(),
  model: t.String(),
  calls: t.Number(),
  inputTokens: t.Number(),
  outputTokens: t.Number(),
  costEstimate: t.Number(),
});

const SummaryPeriod = t.Object({
  inputTokens: t.Number(),
  outputTokens: t.Number(),
  costEstimate: t.Number(),
});

const CostSummaryResponse = t.Object({
  today: SummaryPeriod,
  thisWeek: SummaryPeriod,
  total: SummaryPeriod,
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const aiCostRoutes = new Elysia({ prefix: "/api/ai-cost" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await requireUserId(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return undefined;
  })
  .derive(async ({ headers }) => {
    const userId = await requireUserId(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/summary",
    async ({ userId }) => {
      const summary = getCostSummary(userId);
      return summary;
    },
    {
      response: { 200: CostSummaryResponse, 401: ErrorResponse },
    },
  )
  .get(
    "/by-feature",
    async ({ userId }) => {
      const stats = getUsageStats(userId);
      return stats;
    },
    {
      response: { 200: t.Array(FeatureUsageItem), 401: ErrorResponse },
    },
  );
