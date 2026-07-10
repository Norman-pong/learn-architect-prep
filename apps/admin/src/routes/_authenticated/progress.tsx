import { createFileRoute } from "@tanstack/react-router";
import { ProgressPage } from "../../features/stats-progress-history";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});
