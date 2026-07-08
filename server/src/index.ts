import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { getDb } from "./db";
import { healthPlugin } from "./modules/health";
import { authPlugin } from "./modules/auth";
import { knowledgePlugin } from "./modules/knowledge";
import { quizPlugin } from "./modules/quiz";
import { examPlugin } from "./modules/exam";
import { writingPlugin } from "./modules/writing";
import { aiPlugin } from "./modules/ai";
import { statsPlugin } from "./modules/stats";
import { personalizationPlugin } from "./modules/personalization";
import { dataPlugin } from "./modules/data";

// Initialize database connection (WAL mode enabled in getDb)
getDb();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const app = new Elysia()
  .use(
    cors({
      origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/],
      credentials: true,
    }),
  )
  .use(healthPlugin)
  .use(authPlugin)
  .use(knowledgePlugin)
  .use(quizPlugin)
  .use(examPlugin)
  .use(writingPlugin)
  .use(aiPlugin)
  .use(statsPlugin)
  .use(personalizationPlugin)
  .use(dataPlugin)
  .listen(PORT);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
