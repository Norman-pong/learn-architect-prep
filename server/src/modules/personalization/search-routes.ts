import { Elysia, t } from "elysia";
import { searchKnowledge } from "./search-service";

export const searchRoutes = new Elysia({ prefix: "/api/search" }).get(
  "/",
  async ({ query: { q } }) => {
    const results = await searchKnowledge(q ?? "");
    return { results };
  },
  {
    query: t.Object({
      q: t.String({ minLength: 1, maxLength: 200 }),
    }),
    response: t.Object({
      results: t.Array(
        t.Object({
          kpId: t.String(),
          title: t.String(),
          chapterId: t.String(),
          chapterName: t.String(),
          snippet: t.String(),
          highlights: t.Array(t.String()),
        }),
      ),
    }),
  },
);

export default searchRoutes;
