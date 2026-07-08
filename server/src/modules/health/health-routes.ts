import { Elysia } from "elysia";
import type { HealthCheckResponse } from "@archprep/shared";

export const healthRoutes = new Elysia({ prefix: "/health" }).get("/", () => {
  const response: HealthCheckResponse = { status: "ok" };
  return response;
});
