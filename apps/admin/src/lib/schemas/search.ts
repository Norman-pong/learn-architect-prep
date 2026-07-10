import { z } from "zod";

export const searchResultSchema = z.object({
  kpId: z.string(),
  title: z.string(),
  chapterId: z.string(),
  chapterName: z.string(),
  snippet: z.string(),
  highlights: z.array(z.string()),
  relevance: z.number().optional(),
});
