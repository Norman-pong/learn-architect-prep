import { createFileRoute } from "@tanstack/react-router";
import { QuizPage } from "../../features/quiz-error-bank-weakness";

export const Route = createFileRoute("/_authenticated/quiz")({
  component: QuizPage,
});
