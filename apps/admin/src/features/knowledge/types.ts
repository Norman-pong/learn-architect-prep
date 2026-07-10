import type { z } from "zod";
import type { chapterMetaArraySchema } from "../../lib/schemas/chapter-meta";
import type { chapterIndexSchema } from "../../lib/schemas/chapter-index";

export type ChapterMeta = z.infer<typeof chapterMetaArraySchema>[number];
export type ChapterIndex = z.infer<typeof chapterIndexSchema>;
export type KnowledgePoint = ChapterIndex["knowledgePoints"][number];

export type AnnotationType = "highlight" | "note" | "question";

export interface Annotation {
  id: string;
  userId: string;
  knowledgePointId: string;
  content: string;
  type: AnnotationType;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string;
}

export interface CreateAnnotationInput {
  knowledgePointId: string;
  type: AnnotationType;
  content: string;
  startOffset?: number;
  endOffset?: number;
}

export interface SelectionState {
  text: string;
  startOffset: number;
  endOffset: number;
  x: number;
  y: number;
}

export interface DraftAnnotation extends SelectionState {
  type: Exclude<AnnotationType, "highlight">;
  content: string;
}

export interface TreeNode {
  key: string;
  title: string;
  weight?: number;
  children?: TreeNode[];
}
