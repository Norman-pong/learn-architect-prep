import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getStatsByChapter, getStatsByKnowledgePoint, getTrends } from "./stats-service";

const ErrorResponse = t.Object({ error: t.String() });

const ChapterStatsItem = t.Object({
  chapterId: t.String(),
  chapterName: t.String(),
  total: t.Number(),
  correct: t.Number(),
  accuracy: t.Number(),
  rank: t.Optional(t.Number()),
});

const KnowledgePointStatsItem = t.Object({
  knowledgePointId: t.String(),
  knowledgePointName: t.String(),
  chapterId: t.String(),
  chapterName: t.String(),
  total: t.Number(),
  correct: t.Number(),
  accuracy: t.Number(),
  weak: t.Boolean(),
});

const DailyTrendItem = t.Object({
  date: t.String(),
  total: t.Number(),
  correct: t.Number(),
  accuracy: t.Number(),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const statsRoutes = new Elysia({ prefix: "/api/stats" })
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
    "/chapter",
    async ({ query, userId }) => {
      const days = query.days ? Number.parseInt(query.days, 10) : undefined;
      const stats = await getStatsByChapter(userId, days);
      return stats;
    },
    {
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      response: { 200: t.Array(ChapterStatsItem), 401: ErrorResponse },
    },
  )
  .get(
    "/knowledge-point",
    async ({ query, userId }) => {
      const days = query.days ? Number.parseInt(query.days, 10) : undefined;
      const stats = await getStatsByKnowledgePoint(userId, days);
      return stats;
    },
    {
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      response: { 200: t.Array(KnowledgePointStatsItem), 401: ErrorResponse },
    },
  )
  .get(
    "/trends",
    async ({ query, userId }) => {
      const days = query.days ? Number.parseInt(query.days, 10) : 30;
      const trends = await getTrends(userId, days);
      return trends;
    },
    {
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      response: { 200: t.Array(DailyTrendItem), 401: ErrorResponse },
    },
  );
