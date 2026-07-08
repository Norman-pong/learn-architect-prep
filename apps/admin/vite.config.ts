import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 5188,
    strictPort: true,
    host: "127.0.0.1",
  },
  plugins: [react()],
});
