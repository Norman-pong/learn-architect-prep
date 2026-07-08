import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import {
  EXAM_MODE_LABELS,
  EXAM_TYPE_LABELS,
  PASS_SCORE,
  getExamHistory,
  getScoreTrends,
} from "../services/exam-history";

const ErrorResponse = t.Object({ error: t.String() });

const ExamTypeLiteral = t.Union([
  t.Literal("comprehensive"),
  t.Literal("case"),
  t.Literal("essay"),
]);

const HistoryItem = t.Object({
  id: t.String(),
  examType: t.Union([ExamTypeLiteral, t.String()]),
  mode: t.String(),
  status: t.String(),
  score: t.Union([t.Number(), t.Null()]),
  duration: t.Number(),
  startedAt: t.String(),
  finishedAt: t.Union([t.String(), t.Null()]),
  passed: t.Union([t.Boolean(), t.Null()]),
});

const HistoryResponse = t.Object({
  items: t.Array(HistoryItem),
  passScore: t.Number(),
  examTypeLabels: t.Record(t.String(), t.String()),
  modeLabels: t.Record(t.String(), t.String()),
});

const TrendPoint = t.Object({
  date: t.String(),
  score: t.Number(),
  passed: t.Boolean(),
});

const ExamTypeTrendItem = t.Object({
  examType: ExamTypeLiteral,
  examTypeLabel: t.String(),
  points: t.Array(TrendPoint),
  bestScore: t.Union([t.Number(), t.Null()]),
  latestScore: t.Union([t.Number(), t.Null()]),
  latestPassed: t.Union([t.Boolean(), t.Null()]),
  attemptCount: t.Number(),
  passedCount: t.Number(),
});

const TrendsResponse = t.Object({
  rangeStart: t.String(),
  rangeEnd: t.String(),
  passScore: t.Number(),
  total: t.Array(ExamTypeTrendItem),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const examHistoryRoutes = new Elysia({ prefix: "/api/exam-history" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
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
    "/",
    async ({ query, userId }) => {
      const examType = query.examType;
      const limit = query.limit ? Number.parseInt(query.limit, 10) : 200;
      const items = getExamHistory(userId, examType, Number.isFinite(limit) ? limit : 200);
      return {
        items,
        passScore: PASS_SCORE,
        examTypeLabels: EXAM_TYPE_LABELS,
        modeLabels: EXAM_MODE_LABELS,
      };
    },
    {
      query: t.Object({
        examType: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      response: { 200: HistoryResponse, 401: ErrorResponse },
      detail: {
        summary: "List exam history records",
        tags: ["Exam History"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/trends",
    async ({ query, userId }) => {
      const days = query.days ? Number.parseInt(query.days, 10) : 90;
      const examType = query.examType;
      const trends = getScoreTrends(userId, Number.isFinite(days) ? days : 90, examType);
      return {
        rangeStart: trends.rangeStart,
        rangeEnd: trends.rangeEnd,
        passScore: PASS_SCORE,
        total: trends.total,
      };
    },
    {
      query: t.Object({
        days: t.Optional(t.String()),
        examType: t.Optional(t.String()),
      }),
      response: { 200: TrendsResponse, 401: ErrorResponse },
      detail: {
        summary: "Score trend across recent days",
        tags: ["Exam History"],
        security: [{ bearerAuth: [] }],
      },
    },
  );

export default examHistoryRoutes;
