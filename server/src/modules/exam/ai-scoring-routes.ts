import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../auth/auth-service";
import { scoreEssay } from "./ai-scoring-service";

const AUTH_HEADER = t.Object({ authorization: t.Optional(t.String()) });

export const aiScoringRoutes = new Elysia({ prefix: "/api/ai-scoring" }).post(
  "/essay",
  async ({ request, body }) => {
    const authorization = request.headers.get("authorization") ?? undefined;
    const userId = await getUserIdFromToken(authorization);
    if (!userId) {
      return { status: "error" as const, message: "未登录" };
    }

    try {
      const { stream, resultPromise } = await scoreEssay(userId, body.writingId);

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const data = JSON.stringify({ type: "chunk", data: chunk });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            const result = await resultPromise;
            const data = JSON.stringify({ type: "done", data: result });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            controller.close();
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            const data = JSON.stringify({ type: "error", message: error });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message === "AI_CONFIG_MISSING") {
        return { status: "error" as const, message: "请先配置 AI" };
      }
      if (message === "AI_KEY_MISSING") {
        return { status: "error" as const, message: "请先配置 AI" };
      }
      if (message === "AI_TIMEOUT") {
        return { status: "error" as const, message: "AI 服务超时，请稍后重试" };
      }
      if (message === "论文不存在或无权访问") {
        return { status: "error" as const, message: "论文不存在或无权访问" };
      }

      return { status: "error" as const, message: `评分失败: ${message}` };
    }
  },
  {
    headers: AUTH_HEADER,
    body: t.Object({
      writingId: t.String(),
    }),
  },
);
