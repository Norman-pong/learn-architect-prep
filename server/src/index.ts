import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { knowledgeRoutes } from "./routes/knowledge";
import { quizRoutes } from "./routes/quiz";
import { getDb } from "./db";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { aiConfigRoutes } from "./routes/ai-config";
import { sampleRoutes } from "./routes/samples";
import { templateRoutes } from "./routes/templates";
import { writingRoutes } from "./routes/writings";
import { quizBankRoutes } from "./routes/quiz-bank";
import { reviewRoutes } from "./routes/review";

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
  .use(healthRoutes)
  .use(authRoutes)
  .use(aiConfigRoutes)
  .use(sampleRoutes)
  .use(templateRoutes)
  .use(writingRoutes)
  .use(knowledgeRoutes)
  .use(quizBankRoutes)
  .use(reviewRoutes)
  .use(quizRoutes)
  .listen(PORT);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
