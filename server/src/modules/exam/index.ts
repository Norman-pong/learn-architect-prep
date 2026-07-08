import { Elysia } from "elysia";
import { examRoutes } from "./exam-routes";
import { comprehensiveExamRoutes } from "./comprehensive-exam-routes";
import { caseExamRoutes } from "./case-exam-routes";
import { essayExamRoutes } from "./essay-exam-routes";
import { examHistoryRoutes } from "./exam-history-routes";
import { aiScoringRoutes } from "./ai-scoring-routes";
import { smartSelectRoutes } from "./smart-select-routes";

export const examPlugin = new Elysia({ name: "Module.Exam" })
  .use(examRoutes)
  .use(comprehensiveExamRoutes)
  .use(caseExamRoutes)
  .use(essayExamRoutes)
  .use(examHistoryRoutes)
  .use(aiScoringRoutes)
  .use(smartSelectRoutes);

export default examPlugin;
