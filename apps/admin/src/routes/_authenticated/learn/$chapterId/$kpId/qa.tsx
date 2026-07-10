import { createFileRoute } from "@tanstack/react-router";
import { QAPage } from "../../../../../features/search-qa-home";

export const Route = createFileRoute("/_authenticated/learn/$chapterId/$kpId/qa")({
  component: QAPage,
});
