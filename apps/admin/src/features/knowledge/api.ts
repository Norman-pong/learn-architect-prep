import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { chapterMetaArraySchema } from "../../lib/schemas/chapter-meta";
import { chapterIndexSchema } from "../../lib/schemas/chapter-index";
import type { Annotation, CreateAnnotationInput } from "./types";

export const chaptersQueryKey = ["knowledge", "chapters"];
export const chapterIndexQueryKey = (chapterId: string) => ["knowledge", "chapter", chapterId];
export const knowledgePointQueryKey = (chapterId: string, kpId: string) => [
  "knowledge",
  "content",
  chapterId,
  kpId,
];
export const annotationsQueryKey = (kpId: string) => ["annotations", kpId];

function handleApiError(err: unknown, fallback: string): Error {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
  return new Error(message);
}

export function useChapters() {
  return useQuery({
    queryKey: chaptersQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.knowledge.chapters.get();
      if (error)
        throw new Error(typeof error.value === "string" ? error.value : "加载章节列表失败");
      const parsed = chapterMetaArraySchema.safeParse(
        typeof data === "string" ? JSON.parse(data) : data,
      );
      if (!parsed.success) throw new Error("章节数据格式错误");
      return parsed.data;
    },
  });
}

export function useChapterIndex(chapterId: string | undefined) {
  return useQuery({
    queryKey: chapterIndexQueryKey(chapterId ?? ""),
    queryFn: async () => {
      if (!chapterId) throw new Error("章节 ID 缺失");
      const { data, error } = await api.api.knowledge.chapters[chapterId].get();
      if (error)
        throw new Error(typeof error.value === "string" ? error.value : "加载章节索引失败");
      const parsed = chapterIndexSchema.safeParse(
        typeof data === "string" ? JSON.parse(data) : data,
      );
      if (!parsed.success) throw new Error("章节索引格式错误");
      return parsed.data;
    },
    enabled: !!chapterId,
  });
}

export function useKnowledgePoint(chapterId: string | undefined, kpId: string | undefined) {
  return useQuery({
    queryKey: knowledgePointQueryKey(chapterId ?? "", kpId ?? ""),
    queryFn: async () => {
      if (!chapterId || !kpId) throw new Error("章节或知识点 ID 缺失");
      const { data, error } = await api.api.knowledge.chapters[chapterId][kpId].get();
      if (error) throw new Error(typeof error.value === "string" ? error.value : "加载知识点失败");
      return typeof data === "string" ? data : "";
    },
    enabled: !!chapterId && !!kpId,
  });
}

export function useAnnotations(kpId: string | undefined) {
  return useQuery({
    queryKey: annotationsQueryKey(kpId ?? ""),
    queryFn: async () => {
      if (!kpId) throw new Error("知识点 ID 缺失");
      const { data, error } = await api.api.annotations[kpId].get();
      if (error) throw new Error(typeof error.value === "string" ? error.value : "加载批注失败");
      return (data as Annotation[]).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    enabled: !!kpId,
  });
}

export function useCreateAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAnnotationInput) => {
      // @ts-expect-error Eden Treaty route not derived
      const { data, error } = await api.api.annotations.index.post({ ...input } as {
        knowledgePointId: string;
        type: string;
        content: string;
        startOffset?: number;
        endOffset?: number;
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "创建批注失败");
      return data as Annotation;
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: annotationsQueryKey(input.knowledgePointId) });
    },
    onError: (err) => {
      handleApiError(err, "保存批注失败");
    },
  });
}

export function useDeleteAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { annotationId: string; kpId?: string }) => {
      const { error } = await api.api.annotations[input.annotationId].delete();
      if (error) throw new Error(typeof error.value === "string" ? error.value : "删除批注失败");
      return { success: true, kpId: input.kpId ?? null };
    },
    onSuccess: (data) => {
      if (data.kpId) {
        queryClient.invalidateQueries({ queryKey: annotationsQueryKey(data.kpId) });
      } else {
        queryClient.invalidateQueries({ queryKey: ["annotations"] });
      }
    },
    onError: (err) => {
      handleApiError(err, "删除批注失败");
    },
  });
}
