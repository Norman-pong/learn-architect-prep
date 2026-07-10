import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getQuestions, recordAnswer, getUserErrorQuestions, getQuestionById } from "./quiz-service";

const QuestionsQuery = t.Object({
  mode: t.Union([t.Literal("chapter"), t.Literal("random"), t.Literal("error")]),
  chapter: t.Optional(t.String()),
  count: t.Optional(t.String()),
});

const QuestionsResponse = t.Array(
  t.Object({
    id: t.String(),
    question: t.String(),
    options: t.Record(t.String(), t.String()),
    chapter: t.String(),
    difficulty: t.Union([t.Literal("easy"), t.Literal("medium"), t.Literal("hard")]),
    source: t.String(),
    year: t.Number(),
  }),
);

const SubmitBody = t.Object({
  questionId: t.String(),
  selectedAnswer: t.String(),
});

const SubmitResponse = t.Object({
  isCorrect: t.Boolean(),
  correctAnswer: t.String(),
  explanation: t.String(),
});

const ErrorResponse = t.Object({ error: t.String() });

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const quizRoutes = new Elysia({ prefix: "/api/quiz" })
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
    "/questions",
    async ({ query, userId }) => {
      const count = Number.parseInt(query.count ?? "20", 10);
      const questions = await getQuestions(userId, {
        mode: query.mode,
        chapter: query.chapter,
        count: Number.isNaN(count) ? 20 : count,
      });
      return questions;
    },
    {
      query: QuestionsQuery,
      response: { 200: QuestionsResponse, 401: ErrorResponse },
    },
  )
  .post(
    "/submit",
    async ({ body, userId, set }) => {
      const result = await recordAnswer(userId, body.questionId, body.selectedAnswer);
      if (!result) {
        set.status = 404;
        return { error: "题目不存在" };
      }
      return result;
    },
    {
      body: SubmitBody,
      response: { 200: SubmitResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .get(
    "/error-questions",
    async ({ userId }) => {
      const questions = await getUserErrorQuestions(userId);
      return questions;
    },
    {
      response: { 200: QuestionsResponse, 401: ErrorResponse },
    },
  )
  .get(
    "/questions/:questionId/answer",
    async ({ params: { questionId }, set }) => {
      const question = await getQuestionById(questionId);
      if (!question) {
        set.status = 404;
        return { error: "题目不存在" };
      }
      return {
        correctAnswer: question.answer,
        explanation: question.explanation,
      };
    },
    {
      params: t.Object({ questionId: t.String() }),
      response: {
        200: t.Object({
          correctAnswer: t.String(),
          explanation: t.String(),
        }),
        401: ErrorResponse,
        404: ErrorResponse,
      },
    },
  );

export default quizRoutes;
