import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import {
  generateExamPaper,
  submitAnswer,
  gradeExam,
  getExamReport,
} from "./comprehensive-exam-service";

const ErrorResponse = t.Object({ error: t.String() });

const PaperQuery = t.Object({
  examId: t.String(),
});

const PaperResponse = t.Object({
  examId: t.String(),
  questions: t.Array(
    t.Object({
      id: t.String(),
      question: t.String(),
      options: t.Record(t.String(), t.String()),
      chapter: t.String(),
      difficulty: t.String(),
      source: t.String(),
      year: t.Union([t.Number(), t.Null()]),
    }),
  ),
  duration: t.Number(),
  remainingTime: t.Number(),
});

const SubmitBody = t.Object({
  examId: t.String(),
  questionId: t.String(),
  answer: t.String(),
});

const SubmitResponse = t.Object({
  success: t.Boolean(),
});

const FinishBody = t.Object({
  examId: t.String(),
});

const ReportResponse = t.Object({
  examId: t.String(),
  score: t.Number(),
  total: t.Number(),
  passLine: t.Number(),
  passed: t.Boolean(),
  duration: t.Number(),
  chapterDistribution: t.Array(
    t.Object({
      chapter: t.String(),
      total: t.Number(),
      correct: t.Number(),
      rate: t.Number(),
    }),
  ),
  wrongQuestions: t.Array(
    t.Object({
      id: t.String(),
      question: t.String(),
      options: t.Record(t.String(), t.String()),
      chapter: t.String(),
      correctAnswer: t.String(),
      userAnswer: t.String(),
      explanation: t.String(),
    }),
  ),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const comprehensiveExamRoutes = new Elysia({ prefix: "/api/exam/comp" })
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
    "/paper",
    async ({ query, userId, set }) => {
      const paper = await generateExamPaper(userId, query.examId);
      if (!paper) {
        set.status = 404;
        return { error: "Exam not found" };
      }
      return paper;
    },
    {
      query: PaperQuery,
      response: { 200: PaperResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .post(
    "/submit",
    async ({ body, userId, set }) => {
      const result = await submitAnswer(userId, body.examId, body.questionId, body.answer);
      if (!result.success) {
        set.status = 404;
        return { error: "Exam not found or not in progress" };
      }
      return result;
    },
    {
      body: SubmitBody,
      response: { 200: SubmitResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .post(
    "/finish",
    async ({ body, userId, set }) => {
      const report = await gradeExam(userId, body.examId);
      if (!report) {
        set.status = 404;
        return { error: "Exam not found" };
      }
      return report;
    },
    {
      body: FinishBody,
      response: { 200: ReportResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  )
  .get(
    "/report",
    async ({ query, userId, set }) => {
      const report = await getExamReport(userId, query.examId);
      if (!report) {
        set.status = 404;
        return { error: "Exam not found" };
      }
      return report;
    },
    {
      query: PaperQuery,
      response: { 200: ReportResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  );

export default comprehensiveExamRoutes;
