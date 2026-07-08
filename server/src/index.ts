import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { healthRoutes } from "./routes/health";
import { getDb } from "./db";

// Initialize database connection (WAL mode enabled in getDb)
getDb();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;

const app = new Elysia()
  .use(
    cors({
      origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/],
      credentials: true,
    }),
  )
  .use(healthRoutes)
  .listen(PORT);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
