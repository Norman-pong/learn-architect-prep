import { Elysia } from "elysia";
import { knowledgeRoutes } from "./knowledge-routes";

export const knowledgePlugin = new Elysia({
  name: "Module.Knowledge",
  prefix: "/knowledge",
}).use(knowledgeRoutes);
