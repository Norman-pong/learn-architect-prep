import { Elysia, t } from "elysia";
import type { Writing, WritingSummary, WritingUpsertBody } from "@archprep/shared";
import { getUserIdFromToken } from "../services/auth";
import {
  deleteWriting,
  getWriting,
  listWritings,
  upsertWriting,
} from "../services/writings";

const sectionsSchema = t.Object({
  summary: t.String(),
  background: t.String(),
  solution: t.String(),
  reflection: t.String(),
  conclusion: t.String(),
});

const upsertBodySchema = t.Object({
  id: t.Optional(t.String()),
  title: t.String({ minLength: 1, maxLength: 200 }),
  sections: sectionsSchema,
});

const summarySchema = t.Object({
  id: t.String(),
  title: t.String(),
  wordCount: t.Number(),
  updatedAt: t.String(),
});

const writingSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  title: t.String(),
  content: sectionsSchema,
  aiScore: t.Optional(t.Union([t.Null(), t.Any()])),
  createdAt: t.String(),
  updatedAt: t.String(),
});

const errorSchema = t.Object({
  error: t.String(),
});

const deleteResponseSchema = t.Object({
  ok: t.Boolean(),
});

const summaryListSchema = t.Array(summarySchema);

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

/**
 * Thesis CRUD (FR-WR-05).
 *
 * Mounts at `/api/writings` and is JWT-gated via the `Authorization`
 * header. The integrator wires this into `server/src/index.ts`.
 */
export const writingsRoutes = new Elysia({ prefix: "/api/writings" })
  .get(
    "/",
    async ({ headers, set }) => {
      const userId = await requireUserId(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const data = listWritings(userId);
      set.status = 200;
      return data;
    },
    {
      response: {
        200: summaryListSchema,
        401: errorSchema,
      },
      detail: {
        summary: "List current user thesis drafts",
        tags: ["Writings"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .get(
    "/:id",
    async ({ params, headers, set }) => {
      const userId = await requireUserId(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const data = getWriting(userId, params.id);
      if (!data) {
        set.status = 404;
        return { error: "论文不存在" };
      }
      set.status = 200;
      return data;
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: writingSchema,
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Fetch one thesis by id",
        tags: ["Writings"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ body, headers, set }) => {
      const userId = await requireUserId(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const data = upsertWriting(userId, body satisfies WritingUpsertBody);
      set.status = 200;
      return data;
    },
    {
      body: upsertBodySchema,
      response: {
        200: writingSchema,
        401: errorSchema,
      },
      detail: {
        summary: "Create or update a thesis draft",
        tags: ["Writings"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, headers, set }) => {
      const userId = await requireUserId(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const removed = deleteWriting(userId, params.id);
      if (!removed) {
        set.status = 404;
        return { error: "论文不存在" };
      }
      set.status = 200;
      return { ok: true };
    },
    {
      params: t.Object({ id: t.String() }),
      response: {
        200: deleteResponseSchema,
        401: errorSchema,
        404: errorSchema,
      },
      detail: {
        summary: "Delete a thesis draft",
        tags: ["Writings"],
        security: [{ bearerAuth: [] }],
      },
    },
  );

// Re-export types for the integrator's `App` type composition.
export type { Writing, WritingSummary, WritingUpsertBody };

export default writingsRoutes;