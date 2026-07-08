import { Elysia } from "elysia";
import { healthRoutes } from "./health-routes";

export const healthPlugin = new Elysia({
  name: "Module.Health",
}).use(healthRoutes);
