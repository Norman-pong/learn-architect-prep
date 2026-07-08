import { defineConfig } from "vite-plus";

export default defineConfig({
  // Minimal workspace root config; per-package config lives in their own vite.config.ts
  plugins: [],

  fmt: {
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
