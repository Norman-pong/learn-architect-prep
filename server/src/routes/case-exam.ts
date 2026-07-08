import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import {
  generateCaseExam,
  getCaseExamPaper,
  submitCaseAnswer,
  gradeCaseExam,
  getCaseExamReport,
} from "../services/case-exam";

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
      referenceAnswer: t.String(),
      chapter: t.String(),
      difficulty: t.String(),
      source: t.String(),
      year: t.Number(),
    }),
  ),
  duration: t.Number(),
  remainingTime: t.Number(),
});

const SubmitBody = t.Object({
  examId: t.String(),
  questionId: t.String(),
  answer: t.String(),
  mermaid: t.Optional(t.String()),
});

const SubmitResponse = t.Object({
  success: t.Boolean(),
});

const FinishBody = t.Object({
  examId: t.String(),
});

const DimensionResponse = t.Object({
  name: t.String(),
  weight: t.Number(),
  score: t.Number(),
  maxScore: t.Number(),
  comment: t.String(),
});

const ReportResponse = t.Object({
  examId: t.String(),
  score: t.Number(),
  maxTotalScore: t.Number(),
  passLine: t.Number(),
  passed: t.Boolean(),
  dimensions: t.Array(DimensionResponse),
  overallComment: t.String(),
  improvementSuggestions: t.Array(t.String()),
  answers: t.Record(
    t.String(),
    t.Object({
      answer: t.String(),
      mermaid: t.Optional(t.String()),
    }),
  ),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const caseExamRoutes = new Elysia({ prefix: "/api/exam/case" })
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
    "/paper",
    async ({ query, userId, set }) => {
      const paper = await getCaseExamPaper(userId, query.examId);
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
      const result = await submitCaseAnswer(
        userId,
        body.examId,
        body.questionId,
        body.answer,
        body.mermaid,
      );
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
      const report = await gradeCaseExam(userId, body.examId);
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
      const report = await getCaseExamReport(userId, query.examId);
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

export default caseExamRoutes;
