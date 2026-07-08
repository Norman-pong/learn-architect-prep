import { Elysia } from "elysia";
import { aiConfigRoutes } from "./ai-config-routes";
import { aiCostRoutes } from "./ai-cost-routes";
import { qaRoutes } from "./qa-routes";

export const aiPlugin = new Elysia({ prefix: "/api" })
  .use(aiConfigRoutes)
  .use(aiCostRoutes)
  .use(qaRoutes);
