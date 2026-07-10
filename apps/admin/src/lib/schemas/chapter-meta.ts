import { z } from "zod";

export const knowledgePointLiteSchema = z.object({
  id: z.string(),
});

export const chapterMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.string(),
  examWeight: z.number(),
  order: z.number(),
  knowledgePoints: z.array(knowledgePointLiteSchema).default([]),
});

export const chapterMetaArraySchema = z.array(chapterMetaSchema);
