import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getDueCards, getCardWithKnowledgePoint, initCard, processReview } from "./sm2";

const errorResponseSchema = t.Object({
  error: t.String(),
});

const cardSchema = t.Object({
  cardId: t.String(),
  userId: t.String(),
  knowledgePointId: t.String(),
  ease: t.Number(),
  interval: t.Number(),
  dueDate: t.String(),
  reps: t.Number(),
  lapses: t.Number(),
});

const cardWithKnowledgePointSchema = t.Object({
  cardId: t.String(),
  userId: t.String(),
  knowledgePointId: t.String(),
  ease: t.Number(),
  interval: t.Number(),
  dueDate: t.String(),
  reps: t.Number(),
  lapses: t.Number(),
  title: t.String(),
  content: t.String(),
  examWeight: t.Number(),
  chapterId: t.String(),
  chapterTitle: t.String(),
});

async function requireUserId(authorization: string | undefined): Promise<string> {
  const userId = await getUserIdFromToken(authorization);
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getUserIdFromSet(set: unknown): string {
  if (!isRecord(set)) {
    throw new Error("Unauthorized");
  }
  const userId = set.userId;
  if (typeof userId !== "string") {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const reviewRoutes = new Elysia({ prefix: "/api/review" })
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
    return undefined;
  })
  .get(
    "/due",
    async ({ set }) => {
      const userId = getUserIdFromSet(set);
      const cards = getDueCards(userId, 100);
      const enriched = await Promise.all(
        cards.map((card) => getCardWithKnowledgePoint(card.cardId)),
      );
      return enriched.filter((c): c is NonNullable<typeof c> => c !== null);
    },
    {
      response: {
        200: t.Array(cardWithKnowledgePointSchema),
        401: errorResponseSchema,
      },
      detail: {
        summary: "Get today's due review cards",
        tags: ["Review"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/init",
    async ({ body, set }) => {
      const userId = getUserIdFromSet(set);
      return initCard(userId, body.knowledgePointId);
    },
    {
      body: t.Object({
        knowledgePointId: t.String({ minLength: 1 }),
      }),
      response: {
        200: cardSchema,
        401: errorResponseSchema,
      },
      detail: {
        summary: "Initialize a review card for a knowledge point",
        tags: ["Review"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/rate",
    async ({ body, set }) => {
      const userId = getUserIdFromSet(set);
      const card = await getCardWithKnowledgePoint(body.cardId);
      if (!card) {
        set.status = 404;
        return { error: "Card not found" };
      }
      if (card.userId !== userId) {
        set.status = 403;
        return { error: "Forbidden" };
      }
      return processReview(body.cardId, body.score);
    },
    {
      body: t.Object({
        cardId: t.String({ minLength: 1 }),
        score: t.Number({ minimum: 0, maximum: 5 }),
      }),
      response: {
        200: cardSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        403: errorResponseSchema,
      },
      detail: {
        summary: "Rate a review card and update SM-2 schedule",
        tags: ["Review"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
