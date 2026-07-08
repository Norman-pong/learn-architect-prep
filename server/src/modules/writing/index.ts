import { Elysia } from "elysia";
import { writingRoutes } from "./writings-routes";
import { templateRoutes } from "./templates-routes";
import { sampleRoutes } from "./samples-routes";
import { scoringStandardsRoutes } from "./scoring-standards-routes";
import { writingTipsRoutes } from "./writing-tips-routes";

export const writingPlugin = new Elysia({ name: "writing" })
  .use(writingRoutes)
  .use(templateRoutes)
  .use(sampleRoutes)
  .use(scoringStandardsRoutes)
  .use(writingTipsRoutes);

export default writingPlugin;
