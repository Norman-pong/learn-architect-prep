import { createFileRoute } from "@tanstack/react-router";
import { CaseExamPage } from "../../../features/exam-review";

export const Route = createFileRoute("/_authenticated/exam/case")({
  component: CaseExamPage,
});
