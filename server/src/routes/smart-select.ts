import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { selectQuestionsByWeakPointId, type SmartSelectResult } from "../services/smart-select";

const QuestionItem = t.Object({
  id: t.String(),
  question: t.String(),
  options: t.Record(t.String(), t.String()),
  chapter: t.String(),
  difficulty: t.Union([t.Literal("easy"), t.Literal("medium"), t.Literal("hard")]),
  source: t.String(),
  year: t.Number(),
});

const SmartSelectResponse = t.Object({
  questions: t.Array(QuestionItem),
  weakPoint: t.Object({
    chapterId: t.String(),
    chapterName: t.String(),
    correctRate: t.Number(),
  }),
  source: t.Union([t.Literal("local"), t.Literal("ai-assisted")]),
  reason: t.String(),
});

const ErrorResponse = t.Object({ error: t.String() });

export const smartSelectRoutes = new Elysia({ prefix: "/api/smart-select" })
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
  .post(
    "/",
    async ({ body, userId }) => {
      const { weakPointId } = body as { weakPointId?: string };
      return await selectQuestionsByWeakPointId(userId, weakPointId);
    },
    {
      body: t.Object({
        weakPointId: t.Optional(t.String()),
      }),
      response: { 200: SmartSelectResponse, 401: ErrorResponse },
    },
  );

export default smartSelectRoutes;
