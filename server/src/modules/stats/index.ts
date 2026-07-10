import { Elysia } from "elysia";
import { statsRoutes } from "./stats-routes";
import { dashboardRoutes } from "./dashboard-routes";
import { weaknessRoutes } from "./weakness-routes";

export const statsPlugin = new Elysia().use(statsRoutes).use(dashboardRoutes).use(weaknessRoutes);

export default statsPlugin;
