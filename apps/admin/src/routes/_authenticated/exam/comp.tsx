import { createFileRoute } from "@tanstack/react-router";
import { CompExamPage } from "../../../features/exam-review";

export const Route = createFileRoute("/_authenticated/exam/comp")({
  component: CompExamPage,
});
