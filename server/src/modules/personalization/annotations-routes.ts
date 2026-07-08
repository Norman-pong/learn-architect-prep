import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import {
  AnnotationValidationError,
  addAnnotation,
  deleteAnnotation,
  getAnnotations,
} from "./annotations-service";

const ErrorResponse = t.Object({ error: t.String() });

const AnnotationSchema = t.Object({
  id: t.String(),
  userId: t.String(),
  knowledgePointId: t.String(),
  content: t.String(),
  type: t.String(),
  startOffset: t.Any(),
  endOffset: t.Any(),
  createdAt: t.String(),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const annotationsRoutes = new Elysia({ prefix: "/api/annotations" })
  .derive(({ headers }) => ({ authorization: headers.authorization }))
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
    "/:kpId",
    async ({ params, userId }) => {
      return getAnnotations(userId, params.kpId);
    },
    {
      params: t.Object({ kpId: t.String({ minLength: 1 }) }),
      response: { 200: t.Array(AnnotationSchema), 401: ErrorResponse },
      detail: {
        summary: "List annotations for a knowledge point",
        tags: ["Annotations"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/",
    async ({ body, userId, set }) => {
      try {
        return addAnnotation(
          userId,
          body.knowledgePointId,
          body.type,
          body.content,
          body.startOffset,
          body.endOffset,
        );
      } catch (error) {
        if (error instanceof AnnotationValidationError) {
          set.status = 400;
          return { error: error.message };
        }
        throw error;
      }
    },
    {
      body: t.Object({
        knowledgePointId: t.String({ minLength: 1 }),
        type: t.String({ minLength: 1 }),
        content: t.String({ minLength: 1 }),
        startOffset: t.Optional(t.Number()),
        endOffset: t.Optional(t.Number()),
      }),
      response: { 200: AnnotationSchema, 400: ErrorResponse, 401: ErrorResponse },
      detail: {
        summary: "Create a knowledge point annotation",
        tags: ["Annotations"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .delete(
    "/:id",
    async ({ params, userId, set }) => {
      const deleted = deleteAnnotation(userId, params.id);
      if (!deleted) {
        set.status = 404;
        return { error: "Annotation not found" };
      }
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ minLength: 1 }) }),
      response: {
        200: t.Object({ success: t.Boolean() }),
        401: ErrorResponse,
        404: ErrorResponse,
      },
      detail: {
        summary: "Delete a knowledge point annotation",
        tags: ["Annotations"],
        security: [{ bearerAuth: [] }],
      },
    },
  );

export default annotationsRoutes;
