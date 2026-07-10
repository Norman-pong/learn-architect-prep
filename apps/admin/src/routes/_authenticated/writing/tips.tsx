import { createFileRoute } from "@tanstack/react-router";
import { WritingTipsPage } from "@/features/writing/tips";

export const Route = createFileRoute("/_authenticated/writing/tips")({
  component: WritingTipsPage,
});
