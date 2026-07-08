import { Elysia } from "elysia";
import progressRoutes from "./progress-routes";
import recommendRoutes from "./recommend-routes";
import reminderRoutes from "./reminder-routes";
import searchRoutes from "./search-routes";
import annotationsRoutes from "./annotations-routes";

export const personalizationPlugin = new Elysia()
  .use(progressRoutes)
  .use(recommendRoutes)
  .use(reminderRoutes)
  .use(searchRoutes)
  .use(annotationsRoutes);

export default personalizationPlugin;
