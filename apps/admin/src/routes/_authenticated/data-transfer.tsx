import { createFileRoute } from "@tanstack/react-router";
import { DataTransferPage } from "../../features/data-transfer";

export const Route = createFileRoute("/_authenticated/data-transfer")({
  component: DataTransferPage,
});
