import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { getConfig, saveConfig, testConnection } from "./ai-config-service";
import type { AIConfig } from "@archprep/shared";

const providerSchema = t.Union([
  t.Literal("openai"),
  t.Literal("anthropic"),
  t.Literal("deepseek"),
  t.Literal("minimax"),
  t.Literal("kimi"),
  t.Literal("custom"),
]);

const aiConfigResponseSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  provider: providerSchema,
  model: t.Optional(t.String()),
  baseUrl: t.Optional(t.String()),
  updatedAt: t.String(),
});

const aiConfigBodySchema = t.Object({
  provider: providerSchema,
  apiKey: t.String({ minLength: 1 }),
  model: t.Optional(t.String()),
  baseUrl: t.Optional(t.String()),
});

const testConnectionResponseSchema = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

const errorResponseSchema = t.Object({
  error: t.String(),
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

export const aiConfigRoutes = new Elysia({ prefix: "/api/ai-config" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    if (!authorization) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
    const userId = await requireUserId(authorization);
    // Store userId for downstream handlers to avoid re-parsing.
    (set as Record<string, unknown>).userId = userId;
    return undefined;
  })
  .get(
    "/",
    async ({ set }): Promise<AIConfig | null> => {
      const userId = getUserIdFromSet(set);
      return getConfig(userId);
    },
    {
      response: {
        200: t.Union([aiConfigResponseSchema, t.Null()]),
        401: errorResponseSchema,
      },
      detail: {
        summary: "Get current user AI config",
        tags: ["AI Config"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .put(
    "/",
    async ({ body, set }): Promise<typeof aiConfigResponseSchema.static | { error: string }> => {
      const userId = getUserIdFromSet(set);
      const result = saveConfig(userId, {
        provider: body.provider,
        apiKey: body.apiKey,
        model: body.model,
        baseUrl: body.baseUrl,
      });
      if (!result) {
        set.status = 500;
        return { error: "Failed to save config" };
      }
      return result;
    },
    {
      body: aiConfigBodySchema,
      response: {
        200: aiConfigResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema,
      },
      detail: {
        summary: "Save AI config",
        tags: ["AI Config"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/test",
    async ({ set }) => {
      const userId = getUserIdFromSet(set);
      return testConnection(userId);
    },
    {
      response: {
        200: testConnectionResponseSchema,
        401: errorResponseSchema,
      },
      detail: {
        summary: "Test AI connection",
        tags: ["AI Config"],
        security: [{ bearerAuth: [] }],
      },
    },
  );
