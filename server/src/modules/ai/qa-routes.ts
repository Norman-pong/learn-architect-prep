import { Elysia, t } from "elysia";
import { getUserIdFromToken } from "../services/auth";
import { answerQuestion } from "../services/qa";

const AUTH_HEADER = t.Object({ authorization: t.Optional(t.String()) });

export const qaRoutes = new Elysia({ prefix: "/api/qa" }).post(
  "/ask",
  async ({ request, body }) => {
    const authorization = request.headers.get("authorization") ?? undefined;
    const userId = await getUserIdFromToken(authorization);
    if (!userId) {
      return { status: "error" as const, message: "未登录" };
    }

    try {
      const { stream, usage } = await answerQuestion(
        userId,
        body.chapterId,
        body.knowledgePointId,
        body.question,
        body.history,
      );

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const data = JSON.stringify({ type: "chunk", data: chunk });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            await usage;
            const doneData = JSON.stringify({ type: "done" });
            controller.enqueue(new TextEncoder().encode(`data: ${doneData}\n\n`));
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

      if (message === "AI_CONFIG_MISSING" || message === "AI_KEY_MISSING") {
        return { status: "error" as const, message: "请先配置 AI" };
      }
      if (message === "AI_TIMEOUT") {
        return { status: "error" as const, message: "AI 服务超时，请稍后重试" };
      }
      if (message === "KNOWLEDGE_NOT_FOUND") {
        return { status: "error" as const, message: "知识点不存在" };
      }

      return { status: "error" as const, message: `答疑失败: ${message}` };
    }
  },
  {
    headers: AUTH_HEADER,
    body: t.Object({
      chapterId: t.String(),
      knowledgePointId: t.String(),
      question: t.String({ minLength: 1 }),
      history: t.Optional(
        t.Array(
          t.Object({
            role: t.Union([t.Literal("user"), t.Literal("assistant")]),
            content: t.String(),
          }),
        ),
      ),
    }),
  },
);
