import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "../../features/search-qa-home";

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});
