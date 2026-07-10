import { createFileRoute } from "@tanstack/react-router";
import { ExamHistoryPage } from "../../../features/stats-progress-history";

export const Route = createFileRoute("/_authenticated/exam/history")({
  component: ExamHistoryPage,
});
