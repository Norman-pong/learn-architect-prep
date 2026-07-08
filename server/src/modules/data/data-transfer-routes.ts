import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { exportData, importData } from "./data-transfer-service";

const AUTH_HEADER = t.Object({ authorization: t.Optional(t.String()) });

export const dataTransferRoutes = new Elysia({ prefix: "/api/data" })
  .get(
    "/export",
    async ({ request, set }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) {
        set.status = 401;
        return { status: "error" as const, message: "未登录" };
      }
      const data = exportData(userId);
      const filename = `archprep-backup-${userId}-${new Date().toISOString().slice(0, 10)}.json`;
      set.headers["content-type"] = "application/json";
      set.headers["content-disposition"] = `attachment; filename="${filename}"`;
      return JSON.stringify(data, null, 2);
    },
    { headers: AUTH_HEADER },
  )
  .post(
    "/import",
    async ({ request, body, set }) => {
      const authorization = request.headers.get("authorization") ?? undefined;
      const userId = await getUserIdFromToken(authorization);
      if (!userId) {
        set.status = 401;
        return { status: "error" as const, message: "未登录" };
      }
      try {
        const result = importData(userId, body);
        return { status: "ok" as const, imported: result.imported, errors: result.errors };
      } catch (e) {
        set.status = 400;
        return { status: "error" as const, message: e instanceof Error ? e.message : String(e) };
      }
    },
    { headers: AUTH_HEADER, body: t.Unknown() },
  );

export default dataTransferRoutes;
