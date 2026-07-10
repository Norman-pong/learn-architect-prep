import { createFileRoute } from "@tanstack/react-router";
import { ErrorBookPage } from "../../features/quiz-error-bank-weakness";

export const Route = createFileRoute("/_authenticated/error-book")({
  component: ErrorBookPage,
});
