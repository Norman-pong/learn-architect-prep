import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { LoginForm } from "../features/auth";

export const Route = createFileRoute("/login")({
  component: LoginForm,
  beforeLoad: async () => {
    await api.health.get().catch(() => undefined);
  },
});
