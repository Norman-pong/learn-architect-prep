import { createFileRoute } from "@tanstack/react-router";
import { WritingWorkbench } from "@/features/writing";

export const Route = createFileRoute("/_authenticated/writing")({
  component: WritingWorkbench,
});
