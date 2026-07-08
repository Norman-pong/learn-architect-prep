import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { getWeakPoints } from "../services/weakness";

const WeakPointItem = t.Object({
  chapterId: t.String(),
  chapterName: t.String(),
  section: t.String(),
  correctRate: t.Number(),
  totalQuestions: t.Number(),
  correctCount: t.Number(),
  isWeak: t.Boolean(),
});

const ErrorResponse = t.Object({ error: t.String() });

export const weaknessRoutes = new Elysia({ prefix: "/api/weakness" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await getUserIdFromToken(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  })
  .derive(async ({ headers }) => {
    const userId = await getUserIdFromToken(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/",
    async ({ userId }) => {
      return await getWeakPoints(userId);
    },
    {
      response: { 200: t.Array(WeakPointItem), 401: ErrorResponse },
    },
  );

export default weaknessRoutes;
