import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { createErrorReport, listErrorReports } from "./error-reports-service";

const ErrorReportBody = t.Object({
  questionId: t.String(),
  type: t.String(),
  description: t.String(),
});

const ErrorReportResponse = t.Object({
  id: t.String(),
  success: t.Boolean(),
});

const ErrorReportItem = t.Object({
  id: t.String(),
  userId: t.String(),
  questionId: t.String(),
  description: t.String(),
  type: t.String(),
  status: t.Union([t.Literal("pending"), t.Literal("resolved"), t.Literal("rejected")]),
  createdAt: t.String(),
});

const ErrorResponse = t.Object({ error: t.String() });

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const errorReportsRoutes = new Elysia({ prefix: "/api/error-reports" })
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
  .post(
    "/",
    async ({ body, userId }) => {
      const report = createErrorReport({
        userId,
        questionId: body.questionId,
        type: body.type,
        description: body.description,
      });
      return { id: report.id, success: true };
    },
    {
      body: ErrorReportBody,
      response: { 200: ErrorReportResponse, 401: ErrorResponse },
    },
  )
  .get(
    "/",
    async () => {
      const reports = listErrorReports();
      return reports;
    },
    {
      response: { 200: t.Array(ErrorReportItem), 401: ErrorResponse },
    },
  );

export default errorReportsRoutes;
