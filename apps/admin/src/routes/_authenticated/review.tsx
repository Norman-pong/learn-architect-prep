import { createFileRoute } from "@tanstack/react-router";
import { ReviewPage } from "../../features/exam-review";

export const Route = createFileRoute("/_authenticated/review")({
  component: ReviewPage,
});
