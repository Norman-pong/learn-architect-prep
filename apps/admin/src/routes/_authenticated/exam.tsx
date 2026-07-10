import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/exam")({
  component: () => (
    <div className="h-full">
      <Outlet />
    </div>
  ),
});
