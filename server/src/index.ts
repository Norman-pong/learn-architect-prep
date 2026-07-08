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
import { statsRoutes } from "./routes/stats";
import { dashboardRoutes } from "./routes/dashboard";
import { examRoutes } from "./routes/exam";
import { aiScoringRoutes } from "./routes/ai-scoring";
import { weaknessRoutes } from "./routes/weakness";
import { errorBookRoutes } from "./routes/error-book";
import { essayExamRoutes } from "./routes/essay-exam";
import { recommendRoutes } from "./routes/recommend";
import { smartSelectRoutes } from "./routes/smart-select";
import { comprehensiveExamRoutes } from "./routes/comprehensive-exam";
import { caseExamRoutes } from "./routes/case-exam";
import { errorReportsRoutes } from "./routes/error-reports";
import { aiCostRoutes } from "./routes/ai-cost";
import { dataTransferRoutes } from "./routes/data-transfer";
import { searchRoutes } from "./routes/search";
import { writingTipsRoutes } from "./routes/writing-tips";
import { progressRoutes } from "./routes/progress";
import { reminderRoutes } from "./routes/reminder";
import { scoringStandardsRoutes } from "./routes/scoring-standards";
import { annotationsRoutes } from "./routes/annotations";
import { examHistoryRoutes } from "./routes/exam-history";
import { qaRoutes } from "./routes/qa";

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
  .use(statsRoutes)
  .use(dashboardRoutes)
  .use(quizRoutes)
  .use(weaknessRoutes)
  .use(aiScoringRoutes)
  .use(examRoutes)
  .use(comprehensiveExamRoutes)
  .use(caseExamRoutes)
  .use(essayExamRoutes)
  .use(smartSelectRoutes)
  .use(errorBookRoutes)
  .use(errorReportsRoutes)
  .use(scoringStandardsRoutes)
  .use(recommendRoutes)
  .use(annotationsRoutes)
  .use(searchRoutes)
  .use(aiCostRoutes)
  .use(dataTransferRoutes)
  .use(writingTipsRoutes)
  .use(progressRoutes)
  .use(reminderRoutes)
  .use(examHistoryRoutes)
  .use(qaRoutes)
  .listen(PORT);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
