import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import {
  generateExamPaper,
  submitEssay,
  gradeEssayExam,
  getExamReport,
} from "./essay-exam-service";

const ErrorResponse = t.Object({ error: t.String() });

const PaperQuery = t.Object({
  examId: t.String(),
});

const PaperResponse = t.Object({
  examId: t.String(),
  questions: t.Array(
    t.Object({
      id: t.String(),
      title: t.String(),
      requirements: t.Array(t.String()),
      referenceOutline: t.Optional(t.String()),
      source: t.String(),
      year: t.Nullable(t.Number()),
      hash: t.String(),
    }),
  ),
  duration: t.Number(),
  remainingTime: t.Number(),
});

const SubmitBody = t.Object({
  examId: t.String(),
  selectedQuestionId: t.String(),
  sections: t.Record(t.String(), t.String()),
});

const SubmitResponse = t.Object({
  success: t.Boolean(),
});

const FinishBody = t.Object({
  examId: t.String(),
});

const Dimension = t.Object({
  name: t.String(),
  weight: t.Number(),
  score: t.Number(),
  maxScore: t.Number(),
  comment: t.String(),
});

const SectionFeedback = t.Object({
  section: t.String(),
  comment: t.String(),
  suggestions: t.Array(t.String()),
});

const Deduction = t.Object({
  reason: t.String(),
  severity: t.Union([t.Literal("minor"), t.Literal("major"), t.Literal("critical")]),
  suggestion: t.String(),
});

const ReportResponse = t.Object({
  examId: t.String(),
  score: t.Number(),
  total: t.Number(),
  passLine: t.Number(),
  passed: t.Boolean(),
  duration: t.Number(),
  writingId: t.String(),
  selectedQuestionId: t.String(),
  dimensions: t.Array(Dimension),
  sectionFeedbacks: t.Array(SectionFeedback),
  deductions: t.Array(Deduction),
  overallComment: t.String(),
  improvementSuggestions: t.Array(t.String()),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const essayExamRoutes = new Elysia({ prefix: "/api/exam/essay" })
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
    async ({ body, userId }) => {
      const sections = body.sections as Record<string, string>;
      const result = await submitEssay(userId, body.examId, body.selectedQuestionId, sections);
      if (!result.success) {
        return { error: "提交失败，请检查考试状态或选题" };
      }
      return result;
    },
    {
      body: SubmitBody,
      response: { 200: SubmitResponse, 400: ErrorResponse, 401: ErrorResponse },
    },
  )
  .post(
    "/finish",
    async ({ body, userId }) => {
      try {
        const report = await gradeEssayExam(userId, body.examId);
        if (!report) {
          return { error: "Exam not found or not in progress" };
        }
        return report;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "ESSAY_BANK_EMPTY") {
          return { error: "论文题库为空，请先导入题库数据" };
        }
        return { error: "Internal server error" };
      }
    },
    {
      body: FinishBody,
      response: { 200: ReportResponse, 401: ErrorResponse, 404: ErrorResponse, 500: ErrorResponse },
    },
  )
  .get(
    "/report",
    async ({ query, userId }) => {
      const report = await getExamReport(userId, query.examId);
      if (!report) {
        return { error: "Report not found" };
      }
      return report;
    },
    {
      query: PaperQuery,
      response: { 200: ReportResponse, 401: ErrorResponse, 404: ErrorResponse },
    },
  );

export default essayExamRoutes;
