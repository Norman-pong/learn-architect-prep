import { createFileRoute } from "@tanstack/react-router";
import { QAPage } from "../../../../features/search-qa-home";

export const Route = createFileRoute("/_authenticated/qa/$chapterId/$kpId")({
  component: QAPage,
});
