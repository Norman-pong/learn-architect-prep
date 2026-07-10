import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getAuthToken } from "@/lib/api";
import { toast } from "sonner";
import type {
  DashboardData,
  RecommendItem,
  ChapterMeta,
  ChapterIndex,
  ChatMessage,
  SearchResult,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

export function useDashboard() {
  return useQuery<DashboardData, Error>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.api.dashboard.get();
      if (!data) throw new Error("无数据");
      return data as DashboardData;
    },
  });
}

export function useRecommendations() {
  return useQuery<RecommendItem[], Error>({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data } = await api.api.recommend.get();
      if (!data) throw new Error("无数据");
      return data as RecommendItem[];
    },
  });
}

export function useChapters() {
  return useQuery<ChapterMeta[], Error>({
    queryKey: ["chapters"],
    queryFn: async () => {
      const { data } = await api.api.knowledge.chapters.get();
      if (!data) throw new Error("无数据");
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (!parsed || !Array.isArray(parsed.chapters)) throw new Error("无数据");
      return parsed.chapters as ChapterMeta[];
    },
  });
}

export function useChapterIndex(chapterId: string | undefined) {
  return useQuery<ChapterIndex, Error>({
    queryKey: ["chapterIndex", chapterId],
    queryFn: async () => {
      const { data } = await (
        api.api.knowledge.chapters as unknown as Record<
          string,
          { get: () => Promise<{ data: unknown }> }
        >
      )[chapterId!].get();
      if (!data) throw new Error("无数据");
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return parsed as ChapterIndex;
    },
    enabled: !!chapterId,
  });
}

export function useSearch(q: string) {
  return useQuery<SearchResult[], Error>({
    queryKey: ["search", q],
    queryFn: async () => {
      const term = q.trim();
      if (!term) return [];
      const { data } = await api.api.search.get({ query: { q: term } });
      return (data ?? []) as SearchResult[];
    },
    enabled: q.trim().length > 0,
  });
}

export function useAskQuestion() {
  return useMutation({
    mutationFn: async ({
      chapterId,
      knowledgePointId,
      question,
      history,
      onChunk,
    }: {
      chapterId: string;
      knowledgePointId: string;
      question: string;
      history?: ChatMessage[];
      onChunk: (chunk: string) => void;
    }) => {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/api/qa/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ chapterId, knowledgePointId, question, history }),
      });

      if (!response.ok) {
        const data: unknown = await response.json().catch(() => ({}));
        const message =
          typeof data === "object" &&
          data !== null &&
          "message" in data &&
          typeof data.message === "string"
            ? data.message
            : "请求失败";
        throw new Error(message);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line) as { chunk?: string; done?: boolean };
            if (json.chunk) onChunk(json.chunk);
            if (json.done) break;
          } catch {
            // ignore malformed lines
          }
        }
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "请求失败"),
  });
}
