import { z } from "zod";

export const knowledgePointIndexSchema = z.object({
  id: z.string(),
  title: z.string(),
  file: z.string(),
  examWeight: z.number().default(0),
});

export const chapterIndexSchema = z.object({
  id: z.string(),
  title: z.string(),
  knowledgePoints: z.array(knowledgePointIndexSchema),
});
