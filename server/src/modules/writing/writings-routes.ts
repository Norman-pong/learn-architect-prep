import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { deleteWriting, getWriting, listWritings, upsertWriting } from "./writings-service";

const AUTH_HEADER = t.Object({ authorization: t.Optional(t.String()) });

export const writingRoutes = new Elysia({ prefix: "/api/writings" })
  .get(
    "/",
    async ({ request }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) return { status: "error" as const, message: "未登录" };
      return { status: "ok" as const, data: listWritings(userId) };
    },
    { headers: AUTH_HEADER },
  )
  .get(
    "/:id",
    async ({ request, params: { id } }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) return { status: "error" as const, message: "未登录" };
      const writing = getWriting(userId, id);
      if (!writing) return { status: "error" as const, message: "论文不存在" };
      return { status: "ok" as const, data: writing };
    },
    { headers: AUTH_HEADER, params: t.Object({ id: t.String() }) },
  )
  .post(
    "/",
    async ({ request, body }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) return { status: "error" as const, message: "未登录" };
      const writing = upsertWriting(userId, body);
      return { status: "ok" as const, data: writing };
    },
    {
      headers: AUTH_HEADER,
      body: t.Object({
        id: t.Optional(t.String()),
        title: t.String(),
        sections: t.Object({
          summary: t.String(),
          background: t.String(),
          solution: t.String(),
          reflection: t.String(),
          conclusion: t.String(),
        }),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ request, params: { id } }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) return { status: "error" as const, message: "未登录" };
      const deleted = deleteWriting(userId, id);
      if (!deleted) return { status: "error" as const, message: "论文不存在" };
      return { status: "ok" as const };
    },
    { headers: AUTH_HEADER, params: t.Object({ id: t.String() }) },
  );
