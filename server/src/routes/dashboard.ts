import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { getDashboard } from "../services/dashboard";
import { getDb } from "../db";

const errorResponseSchema = t.Object({
  error: t.String(),
});

const dashboardResponseSchema = t.Object({
  todayReviewCount: t.Number(),
  streakDays: t.Number(),
  weakPointCount: t.Number(),
  lastMockScore: t.Union([t.Number(), t.Null()]),
});

async function requireUserId(authorization: string | undefined): Promise<string> {
  const userId = await getUserIdFromToken(authorization);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const dashboardRoutes = new Elysia({ prefix: "/api/dashboard" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    if (!authorization) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const userId = await requireUserId(authorization);
    (set as Record<string, unknown>).userId = userId;
  })
  .get(
    "/",
    async ({ set }) => {
      const userId = (set as Record<string, unknown>).userId as string;
      const db = getDb();
      return getDashboard(userId, db);
    },
    {
      response: {
        200: dashboardResponseSchema,
        401: errorResponseSchema,
      },
      detail: {
        summary: "Get user dashboard summary",
        tags: ["Dashboard"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
