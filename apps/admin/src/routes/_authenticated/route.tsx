import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getAuthToken } from "@/lib/api";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const user = useAuthStore.getState().user;
    if (!user && !getAuthToken()) {
      throw redirect({ to: "/login" });
    }
    await api.health.get().catch(() => undefined);
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
