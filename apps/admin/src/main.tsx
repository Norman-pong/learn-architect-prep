import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./lib/router";
import { initThemeMode } from "@/stores/theme";
import "./styles/index.css";

// 在 React 渲染前应用 cookie 主题,避免首屏闪烁
initThemeMode();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
