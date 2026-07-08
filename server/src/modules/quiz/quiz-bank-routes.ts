import { Elysia, t } from "elysia";
import {
  fetchRemoteQuiz,
  readQuestionBank,
  type ChoiceQuestion,
} from "./quiz-bank-service";
import { getUserIdFromToken } from "../auth/auth-service";

const QuestionSchema = t.Object({
  id: t.Optional(t.String()),
  question: t.String({ minLength: 1 }),
  options: t.Record(t.String(), t.String()),
  answer: t.String({ pattern: "^[A-D]$" }),
  explanation: t.Optional(t.String()),
  chapter: t.Optional(t.String()),
  difficulty: t.Optional(t.String({ pattern: "^(easy|medium|hard)$" })),
  source: t.Optional(t.String()),
  hash: t.Optional(t.String()),
  year: t.Optional(t.Union([t.Integer(), t.Null()])),
});

const ImportUrlBody = t.Object({
  url: t.String({ format: "uri", minLength: 1 }),
});

const ImportUrlResponse = t.Object({
  ok: t.Boolean(),
  added: t.Integer(),
  skipped: t.Integer(),
  failed: t.Integer(),
  errors: t.Optional(t.Array(t.Object({ reason: t.String() }))),
});

const SourcesResponse = t.Object({
  sources: t.Array(
    t.Object({
      source: t.String(),
      count: t.Integer(),
    }),
  ),
});

const StatsResponse = t.Object({
  total: t.Integer(),
  byChapter: t.Array(t.Object({ chapter: t.String(), count: t.Integer() })),
  bySource: t.Array(t.Object({ source: t.String(), count: t.Integer() })),
});

function bankStats(questions: ChoiceQuestion[]) {
  const byChapter = new Map<string, number>();
  const bySource = new Map<string, number>();
  for (const q of questions) {
    byChapter.set(q.chapter || "unknown", (byChapter.get(q.chapter || "unknown") || 0) + 1);
    bySource.set(q.source || "unknown", (bySource.get(q.source || "unknown") || 0) + 1);
  }
  return {
    total: questions.length,
    byChapter: Array.from(byChapter.entries())
      .map(([chapter, count]) => ({ chapter, count }))
      .toSorted((a: { count: number }, b: { count: number }) => b.count - a.count),
    bySource: Array.from(bySource.entries())
      .map(([source, count]) => ({ source, count }))
      .toSorted((a: { count: number }, b: { count: number }) => b.count - a.count),
  };
}

export const quizBankRoutes = new Elysia({ prefix: "/api/quiz-bank" })
  // Public: 只读查询题目列表
  .get(
    "/questions",
    async ({ query }) => {
      const bank = await readQuestionBank();
      let questions = bank.questions;
      if (query.chapter) {
        const chapter = typeof query.chapter === "string" ? query.chapter : "";
        questions = questions.filter((q) => q.chapter?.startsWith(chapter));
      }
      if (query.difficulty) {
        questions = questions.filter((q) => q.difficulty === query.difficulty);
      }
      if (query.source) {
        questions = questions.filter((q) => q.source === query.source);
      }
      if (query.year) {
        const year = Number.parseInt(query.year, 10);
        if (!Number.isNaN(year)) {
          questions = questions.filter((q) => q.year === year);
        }
      }
      return questions;
    },
    {
      query: t.Object({
        chapter: t.Optional(t.String()),
        difficulty: t.Optional(t.String({ pattern: "^(easy|medium|hard)$" })),
        source: t.Optional(t.String()),
        year: t.Optional(t.String()),
      }),
      response: t.Array(QuestionSchema),
    },
  )
  // Public: 题库统计
  .get(
    "/stats",
    async () => {
      const bank = await readQuestionBank();
      return bankStats(bank.questions);
    },
    {
      response: StatsResponse,
    },
  )
  // Public: 来源统计
  .get(
    "/sources",
    async () => {
      const bank = await readQuestionBank();
      const map = new Map<string, number>();
      for (const q of bank.questions) {
        const source = q.source || "unknown";
        map.set(source, (map.get(source) || 0) + 1);
      }
      return {
        sources: Array.from(map.entries())
          .map(([source, count]) => ({ source, count }))
          .toSorted((a: { count: number }, b: { count: number }) => b.count - a.count),
      };
    },
    {
      response: SourcesResponse,
    },
  )
  // Auth: 远程拉取+导入
  .post(
    "/import",
    async ({ body, headers, set }) => {
      const userId = await getUserIdFromToken(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      try {
        const result = await fetchRemoteQuiz(body.url);
        return {
          ok: true,
          added: result.added,
          skipped: result.skipped,
          failed: result.failed,
          errors: result.errors.map((e) => ({ reason: e.reason })),
        };
      } catch (err) {
        set.status = 400;
        return {
          ok: false,
          added: 0,
          skipped: 0,
          failed: 0,
          errors: [{ reason: err instanceof Error ? err.message : String(err) }],
        };
      }
    },
    {
      headers: t.Object({
        authorization: t.String({ minLength: 1 }),
      }),
      body: ImportUrlBody,
      response: {
        200: ImportUrlResponse,
        401: t.Object({ error: t.String() }),
        400: ImportUrlResponse,
      },
    },
  );

export default quizBankRoutes;
