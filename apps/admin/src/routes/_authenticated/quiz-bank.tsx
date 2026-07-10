import { createFileRoute } from "@tanstack/react-router";
import { QuizBankPage } from "../../features/quiz-error-bank-weakness";

export const Route = createFileRoute("/_authenticated/quiz-bank")({
  component: QuizBankPage,
});
