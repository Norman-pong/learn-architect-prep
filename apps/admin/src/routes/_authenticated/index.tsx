import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "../../features/search-qa-home";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});
