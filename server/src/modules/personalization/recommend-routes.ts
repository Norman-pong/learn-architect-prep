import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getRecommendations } from "./recommend-service";

const RecommendItem = t.Object({
  knowledgePointId: t.String(),
  title: t.String(),
  chapterId: t.String(),
  correctRate: t.Number(),
  examWeight: t.Number(),
  score: t.Number(),
});

const ErrorResponse = t.Object({ error: t.String() });

export const recommendRoutes = new Elysia({ prefix: "/api/recommend" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await getUserIdFromToken(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    return undefined;
  })
  .derive(async ({ headers }) => {
    const userId = await getUserIdFromToken(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/",
    async ({ userId }) => {
      return await getRecommendations(userId);
    },
    {
      response: { 200: t.Array(RecommendItem), 401: ErrorResponse },
    },
  );

export default recommendRoutes;
