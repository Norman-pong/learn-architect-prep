import { createFileRoute } from "@tanstack/react-router";
import { SamplesPage } from "@/features/writing/samples";

export const Route = createFileRoute("/_authenticated/writing/samples")({
  component: SamplesPage,
});
