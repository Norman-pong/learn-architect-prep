import { apiRequest } from "@/lib/api";

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

export const ANNOTATION_META: Record<AnnotationType, { label: string; color: string }> = {
  highlight: { label: "高亮", color: "warning" },
  note: { label: "笔记", color: "processing" },
  question: { label: "疑问", color: "error" },
};

export function listAnnotations(knowledgePointId: string): Promise<Annotation[]> {
  return apiRequest<Annotation[]>(`/api/annotations/${encodeURIComponent(knowledgePointId)}`);
}

export function createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
  return apiRequest<Annotation>("/api/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function removeAnnotation(annotationId: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/annotations/${encodeURIComponent(annotationId)}`, {
    method: "DELETE",
  });
}
