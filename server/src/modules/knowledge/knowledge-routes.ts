import { Elysia, t } from "elysia";
import path from "node:path";
import { DATA_DIR } from "../../config/paths";

const KNOWLEDGE_DIR = path.join(DATA_DIR, "knowledge");

function chapterDirName(chapterId: string): string {
  const safe = path.basename(chapterId);
  if (safe.startsWith("chapter-")) return safe;
  const num = safe.replace(/^ch/, "");
  return `chapter-${num.padStart(2, "0")}`;
}

export const knowledgeRoutes = new Elysia({ prefix: "/api/knowledge" })
  .get(
    "/chapters",
    async () => {
      const file = Bun.file(path.join(KNOWLEDGE_DIR, "index.json"));
      if (!(await file.exists())) {
        return new Response(JSON.stringify({ error: "章节列表不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(await file.text(), {
        headers: { "Content-Type": "application/json" },
      });
    },
    {
      response: t.String(),
    },
  )
  .get(
    "/chapters/:chapterId",
    async ({ params: { chapterId } }) => {
      const dir = chapterDirName(chapterId);
      const file = Bun.file(path.join(KNOWLEDGE_DIR, dir, "index.json"));
      if (!(await file.exists())) {
        return new Response(JSON.stringify({ error: "章节不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(await file.text(), {
        headers: { "Content-Type": "application/json" },
      });
    },
    {
      params: t.Object({
        chapterId: t.String(),
      }),
      response: t.String(),
    },
  )
  .get(
    "/chapters/:chapterId/:kpId",
    async ({ params: { chapterId, kpId } }) => {
      const dir = chapterDirName(chapterId);
      const safeKpId = path.basename(kpId);
      const indexFile = Bun.file(path.join(KNOWLEDGE_DIR, dir, "index.json"));
      if (!(await indexFile.exists())) {
        return new Response(JSON.stringify({ error: "章节不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      let index: { knowledgePoints: { id: string; file: string }[] };
      try {
        index = JSON.parse(await indexFile.text());
      } catch {
        return new Response(JSON.stringify({ error: "章节索引损坏" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      const kp = index.knowledgePoints.find((item) => item.id === safeKpId);
      if (!kp) {
        return new Response(JSON.stringify({ error: "知识点不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      const file = Bun.file(path.join(KNOWLEDGE_DIR, dir, path.basename(kp.file)));
      if (!(await file.exists())) {
        return new Response(JSON.stringify({ error: "知识点文件不存在" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(await file.text(), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    },
    {
      params: t.Object({
        chapterId: t.String(),
        kpId: t.String(),
      }),
      response: t.String(),
    },
  );
