import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getErrorBook, markMastered } from "./error-book-service";

const ErrorBookItem = t.Object({
  id: t.String(),
  question: t.String(),
  options: t.Record(t.String(), t.String()),
  chapter: t.String(),
  difficulty: t.Union([t.Literal("easy"), t.Literal("medium"), t.Literal("hard")]),
  source: t.String(),
  year: t.Number(),
  selectedAnswer: t.String(),
  correctAnswer: t.String(),
  explanation: t.String(),
  errorAt: t.String(),
  mastered: t.Boolean(),
  masteredAt: t.Optional(t.String()),
});

const ErrorBookResponse = t.Array(ErrorBookItem);

const ErrorResponse = t.Object({ error: t.String() });

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const errorBookRoutes = new Elysia({ prefix: "/api/error-book" })
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
    "/",
    async ({ query, userId }) => {
      const items = await getErrorBook(userId, {
        chapter: query.chapter,
        mastered: query.mastered === "true" ? true : query.mastered === "false" ? false : undefined,
      });
      return items;
    },
    {
      query: t.Object({
        chapter: t.Optional(t.String()),
        mastered: t.Optional(t.String()),
      }),
      response: { 200: ErrorBookResponse, 401: ErrorResponse },
    },
  )
  .post(
    "/master",
    async ({ body, userId, set }) => {
      const ok = await markMastered(userId, body.questionId);
      if (!ok) {
        set.status = 404;
        return { error: "题目不存在" };
      }
      return { success: true };
    },
    {
      body: t.Object({
        questionId: t.String(),
      }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorResponse,
        404: ErrorResponse,
      },
    },
  );

export default errorBookRoutes;
