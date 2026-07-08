import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { getReminderStatus, toggleReminder } from "../services/reminder";

const StatusResponse = t.Object({
  enabled: t.Boolean(),
});

const ErrorResponse = t.Object({
  error: t.String(),
});

async function requireUserId(authorization: string | undefined): Promise<string | null> {
  return getUserIdFromToken(authorization);
}

export const reminderRoutes = new Elysia({ prefix: "/api/reminder" })
  .derive(({ headers }) => {
    return { authorization: headers.authorization };
  })
  .onBeforeHandle(async ({ authorization, set }) => {
    const userId = await requireUserId(authorization);
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }
  })
  .derive(async ({ headers }) => {
    const userId = await requireUserId(headers.authorization);
    return { userId: userId ?? "" };
  })
  .get(
    "/status",
    ({ userId }) => {
      return getReminderStatus(userId);
    },
    {
      response: { 200: StatusResponse, 401: ErrorResponse },
      detail: {
        tags: ["Reminder"],
        security: [{ bearerAuth: [] }],
      },
    },
  )
  .post(
    "/toggle",
    ({ userId }) => {
      return toggleReminder(userId);
    },
    {
      response: { 200: StatusResponse, 401: ErrorResponse },
      detail: {
        tags: ["Reminder"],
        security: [{ bearerAuth: [] }],
      },
    },
  );

export default reminderRoutes;
