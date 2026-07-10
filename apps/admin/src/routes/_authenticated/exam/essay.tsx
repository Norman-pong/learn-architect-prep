import { createFileRoute } from "@tanstack/react-router";
import { EssayExamPage } from "../../../features/exam-review";

export const Route = createFileRoute("/_authenticated/exam/essay")({
  component: EssayExamPage,
});
