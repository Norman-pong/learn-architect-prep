import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/learn")({
  component: () => (
    <div className="h-full">
      <Outlet />
    </div>
  ),
});
