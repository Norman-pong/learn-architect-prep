import { createFileRoute } from "@tanstack/react-router";
import { SettingsAI } from "../../../features/settings";

export const Route = createFileRoute("/_authenticated/settings/ai")({
  component: SettingsAI,
});
