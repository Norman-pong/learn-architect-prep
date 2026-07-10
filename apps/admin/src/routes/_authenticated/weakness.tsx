import { createFileRoute } from "@tanstack/react-router";
import { WeaknessPage } from "../../features/quiz-error-bank-weakness";

export const Route = createFileRoute("/_authenticated/weakness")({
  component: WeaknessPage,
});
