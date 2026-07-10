import { Elysia, t } from "elysia";
import path from "node:path";
import { DATA_DIR } from "../../config/paths";

const SAMPLES_DIR = path.join(DATA_DIR, "writing/samples");

export const sampleRoutes = new Elysia({ prefix: "/api/samples" })
  .get(
    "/",
    async () => {
      const file = Bun.file(path.join(SAMPLES_DIR, "index.json"));
      if (!(await file.exists())) {
        return new Response(JSON.stringify({ error: "范文列表不存在" }), {
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
    "/:slug",
    async ({ params: { slug }, set }) => {
      const safeSlug = path.basename(slug);
      const file = Bun.file(path.join(SAMPLES_DIR, `${safeSlug}.md`));
      if (!(await file.exists())) {
        set.status = 404;
        return { error: "范文不存在" };
      }
      return new Response(await file.text(), {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    },
    {
      params: t.Object({
        slug: t.String(),
      }),
    },
  );
