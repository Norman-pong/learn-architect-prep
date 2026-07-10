import { createFileRoute } from "@tanstack/react-router";
import { TemplatesPage } from "@/features/writing/templates";

export const Route = createFileRoute("/_authenticated/writing/templates")({
  component: TemplatesPage,
});
