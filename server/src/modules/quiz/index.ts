import { Elysia } from "elysia";
import { quizRoutes } from "./quiz-routes";
import { quizBankRoutes } from "./quiz-bank-routes";
import { reviewRoutes } from "./review-routes";
import { errorBookRoutes } from "./error-book-routes";

export const quizPlugin = new Elysia({ name: "Module.Quiz" })
  .use(quizRoutes)
  .use(quizBankRoutes)
  .use(reviewRoutes)
  .use(errorBookRoutes);
