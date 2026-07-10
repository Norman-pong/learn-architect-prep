import { createFileRoute } from "@tanstack/react-router";
import { CostDashboard } from "../../../features/settings";

export const Route = createFileRoute("/_authenticated/settings/ai-cost")({
  component: CostDashboard,
});
