import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const adminDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: adminDir,
  resolve: {
    alias: {
      "@": path.resolve(adminDir, "./src"),
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), TanStackRouterVite()],
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(adminDir, "./src/test/setup.ts")],
    globals: true,
  },
});
