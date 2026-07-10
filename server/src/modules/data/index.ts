import { Elysia } from "elysia";
import dataTransferRoutes from "./data-transfer-routes";
import errorReportsRoutes from "./error-reports-routes";

export const dataPlugin = new Elysia({ name: "Module.Data" })
  .use(dataTransferRoutes)
  .use(errorReportsRoutes);

export default dataPlugin;
