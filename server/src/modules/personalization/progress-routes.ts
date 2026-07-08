import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { getCalendarData, getChapterProgress, getHeatmapData } from "../services/progress";

const ErrorResponse = t.Object({ error: t.String() });

const HeatmapDaySchema = t.Object({
  date: t.String(),
  count: t.Number(),
  duration: t.Number(),
  level: t.Union([t.Literal(0), t.Literal(1), t.Literal(2), t.Literal(3), t.Literal(4)]),
});

const HeatmapDataSchema = t.Object({
  year: t.Number(),
  days: t.Array(HeatmapDaySchema),
  totalActiveDays: t.Number(),
  totalCount: t.Number(),
  totalDuration: t.Number(),
});

const CalendarSessionSchema = t.Object({
  sessionId: t.String(),
  chapterId: t.Union([t.String(), t.Null()]),
  duration: t.Number(),
});

const CalendarDaySchema = t.Object({
  date: t.String(),
  count: t.Number(),
  duration: t.Number(),
  sessions: t.Array(CalendarSessionSchema),
});

const CalendarDataSchema = t.Object({
  month: t.String(),
  days: t.Array(CalendarDaySchema),
});

const ChapterProgressSchema = t.Object({
  chapterId: t.String(),
  chapterTitle: t.String(),
  section: t.String(),
  totalKnowledgePoints: t.Number(),
  studiedKnowledgePoints: t.Number(),
  completionRate: t.Number(),
  totalReviews: t.Number(),
  averageEase: t.Number(),
  masteryRate: t.Number(),
  examWeight: t.Number(),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

const YEAR_QUERY = t.Object({
  year: t.Optional(t.String()),
});

const MONTH_QUERY = t.Object({
  month: t.Optional(t.String()),
});

export const progressRoutes = new Elysia({ prefix: "/api/progress" })
  .derive(({ headers }) => ({ authorization: headers.authorization }))
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await requireUserId(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  })
  .derive(async ({ headers }) => {
    const userId = await requireUserId(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/heatmap",
    async ({ query, userId }) => {
      const year = query.year ? Number.parseInt(query.year, 10) : new Date().getFullYear();
      return await getHeatmapData(userId, year);
    },
    {
      query: YEAR_QUERY,
      response: { 200: HeatmapDataSchema, 401: ErrorResponse },
      detail: {
        summary: "Get annual study heatmap data",
        tags: ["Progress"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/calendar",
    async ({ query, userId }) => {
      const now = new Date();
      const month =
        query.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      return await getCalendarData(userId, month);
    },
    {
      query: MONTH_QUERY,
      response: { 200: CalendarDataSchema, 401: ErrorResponse },
      detail: {
        summary: "Get monthly study calendar with daily detail",
        tags: ["Progress"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/chapters",
    async ({ userId }) => {
      return await getChapterProgress(userId);
    },
    {
      response: { 200: t.Array(ChapterProgressSchema), 401: ErrorResponse },
      detail: {
        summary: "Get per-chapter mastery and completion progress",
        tags: ["Progress"],
        security: [{ bearerAuth: [] }],
      },
    },
  );

export default progressRoutes;
