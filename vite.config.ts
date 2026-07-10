import { defineConfig } from "vite-plus";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(rootDir, "apps/admin");

export default defineConfig({
  root: adminRoot,
  resolve: {
    alias: {
      "@": path.resolve(adminRoot, "./src"),
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
  plugins: [],
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(adminRoot, "./src/test/setup.ts")],
    globals: true,
  },
  fmt: {
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "**/data/**",
      "**/*.md",
      "**/*.json",
      "**/*.gen.ts",
      ".agents/**",
      ".lore/**",
      ".git/**",
      "apps/admin/src/stores/theme.ts",
    ],
  },
  lint: {
    categories: {
      correctness: "warn",
      suspicious: "warn",
    },
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "**/data/**",
      "**/*.md",
      "**/*.json",
      ".agents/**",
      ".lore/**",
      ".git/**",
    ],
    rules: {
      "no-unused-expressions": "error",
      "unicorn/no-array-sort": "off",
    },
  },
  staged: {
    "{apps,server,packages}/**/*.{ts,tsx,js,jsx}": "vp check --fix",
  },
});
