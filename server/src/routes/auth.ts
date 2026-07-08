import { Elysia, t } from "elysia";
import {
  sendCode,
  verifyCode,
  refreshAccessToken,
  getUserIdFromToken,
  getUserById,
} from "../services/auth";

const SendCodeBody = t.Object({
  email: t.String({ format: "email" }),
});

const SendCodeResponse = t.Object({
  ok: t.Boolean(),
});

const VerifyBody = t.Object({
  email: t.String({ format: "email" }),
  code: t.String({ pattern: "^\\d{6}$" }),
});

const VerifyResponse = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
});

const RefreshBody = t.Object({
  refreshToken: t.String(),
});

const RefreshResponse = t.Object({
  accessToken: t.String(),
});

const ErrorResponse = t.Object({
  error: t.String(),
});

const UserResponse = t.Object({
  id: t.String(),
  email: t.String(),
});

export const authRoutes = new Elysia({ prefix: "/auth" })
  .post(
    "/send-code",
    async ({ body, set }) => {
      const result = await sendCode(body.email);
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }
      return { ok: true };
    },
    { body: SendCodeBody, response: { 200: SendCodeResponse, 429: ErrorResponse } },
  )
  .post(
    "/verify",
    async ({ body, set }) => {
      const result = await verifyCode(body.email, body.code);
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }
      return result.data;
    },
    { body: VerifyBody, response: { 200: VerifyResponse, 400: ErrorResponse } },
  )
  .post(
    "/refresh",
    async ({ body, set }) => {
      const result = await refreshAccessToken(body.refreshToken);
      if (!result.ok) {
        set.status = result.status;
        return { error: result.error };
      }
      return result.data;
    },
    { body: RefreshBody, response: { 200: RefreshResponse, 401: ErrorResponse } },
  )
  .get(
    "/me",
    async ({ headers, set }) => {
      const userId = await getUserIdFromToken(headers.authorization);
      if (!userId) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      const user = await getUserById(userId);
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized" };
      }
      return user;
    },
    { response: { 200: UserResponse, 401: ErrorResponse } },
  );

export default authRoutes;
