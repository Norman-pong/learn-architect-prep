import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getAuthToken } from "../../lib/api";
import type {
  Question,
  ErrorBookItem,
  ChapterMeta,
  QuizBankStats,
  QuizBankQuestion,
  QuizBankImportResult,
  WeaknessItem,
  SmartSelectResult,
} from "./types";

export const chaptersQueryKey = ["quiz", "chapters"];
export const errorBookQueryKey = (chapter: string) => ["error-book", chapter];
export const quizBankStatsQueryKey = ["quiz-bank", "stats"];
export const quizBankSourcesQueryKey = ["quiz-bank", "sources"];
export const quizBankQuestionsQueryKey = (filters: Record<string, string | undefined>) => [
  "quiz-bank",
  "questions",
  filters,
];
export const weaknessQueryKey = ["weakness"];

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
      const raw = typeof data === "string" ? JSON.parse(data) : data;
      if (!raw || typeof raw !== "object" || !("chapters" in raw) || !Array.isArray(raw.chapters)) {
        throw new Error("章节数据格式错误");
      }
      return raw.chapters as ChapterMeta[];
    },
  });
}

export function useQuizStart(mode: string, count: number, chapter?: string) {
  return useQuery({
    queryKey: ["quiz", "start", mode, count, chapter],
    queryFn: async () => {
      const { data, error } = await api.api.quiz.questions.get({
        query: { mode: mode as "error" | "chapter" | "random", chapter, count: String(count) },
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "出题失败");
      return (Array.isArray(data) ? data : []) as Question[];
    },
    enabled: false,
  });
}

export function useSmartSelect(weakPointId: string) {
  return useQuery({
    queryKey: ["smart-select", weakPointId],
    queryFn: async () => {
      const { data, error } = await api.api["smart-select"].post({ weakPointId });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "智能选题失败");
      return data as SmartSelectResult;
    },
    enabled: false,
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: async ({
      questionId,
      selectedAnswer,
    }: {
      questionId: string;
      selectedAnswer: string;
    }) => {
      const { data, error } = await api.api.quiz.submit.post({ questionId, selectedAnswer });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "提交失败");
      return data as { isCorrect: boolean; correctAnswer: string; explanation: string };
    },
    onError: (err) => handleApiError(err, "提交失败"),
  });
}

export function useErrorBook(chapter: string) {
  return useQuery({
    queryKey: errorBookQueryKey(chapter),
    queryFn: async () => {
      const { data, error } = await api.api["error-book"].get({
        query: { mastered: "false", chapter: chapter || undefined },
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "加载错题本失败");
      return (Array.isArray(data) ? data : []) as ErrorBookItem[];
    },
  });
}

export function useMasterError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { data, error } = await api.api["error-book"].master.post({ questionId });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "标记已掌握失败");
      return data as { success: boolean };
    },
    onSuccess: () => {
      toast.success("已标记为掌握");
      queryClient.invalidateQueries({ queryKey: ["error-book"] });
      queryClient.invalidateQueries({ queryKey: ["weakness"] });
    },
    onError: (err) => handleApiError(err, "标记已掌握失败"),
  });
}

export function useQuizBankStats() {
  return useQuery({
    queryKey: quizBankStatsQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api["quiz-bank"].stats.get();
      if (error)
        throw new Error(typeof error.value === "string" ? error.value : "加载题库统计失败");
      return data as QuizBankStats;
    },
  });
}

export function useQuizBankSources() {
  return useQuery({
    queryKey: quizBankSourcesQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api["quiz-bank"].sources.get();
      if (error)
        throw new Error(typeof error.value === "string" ? error.value : "加载来源统计失败");
      const raw = typeof data === "string" ? JSON.parse(data) : data;
      if (!raw || typeof raw !== "object" || !("sources" in raw) || !Array.isArray(raw.sources)) {
        return [] as { source: string; count: number }[];
      }
      return raw.sources as { source: string; count: number }[];
    },
  });
}

export function useQuizBankQuestions(filters: {
  chapter?: string;
  difficulty?: string;
  source?: string;
  year?: string;
}) {
  return useQuery({
    queryKey: quizBankQuestionsQueryKey(filters),
    queryFn: async () => {
      const { data, error } = await api.api["quiz-bank"].questions.get({
        query: {
          chapter: filters.chapter || undefined,
          difficulty: filters.difficulty || undefined,
          source: filters.source || undefined,
          year: filters.year || undefined,
        },
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "加载题目失败");
      return (Array.isArray(data) ? data : []) as QuizBankQuestion[];
    },
  });
}

export function useImportQuizBank() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string) => {
      const { data, error } = await api.api["quiz-bank"].import.post(
        { url },
        { headers: { authorization: `Bearer ${getAuthToken() ?? ""}` } },
      );
      if (error) throw new Error(typeof error.value === "string" ? error.value : "导入失败");
      if (!data) throw new Error("导入失败");
      return data as QuizBankImportResult;
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`导入成功：新增 ${result.added} 题，跳过 ${result.skipped} 题`);
      } else {
        toast.error("导入失败，请查看错误信息");
      }
      queryClient.invalidateQueries({ queryKey: quizBankStatsQueryKey });
      queryClient.invalidateQueries({ queryKey: quizBankSourcesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quiz-bank", "questions"] });
    },
    onError: (err) => handleApiError(err, "导入失败"),
  });
}

export function useWeakness() {
  return useQuery({
    queryKey: weaknessQueryKey,
    queryFn: async () => {
      const { data, error } = await api.api.weakness.get();
      if (error) throw new Error(typeof error.value === "string" ? error.value : "加载薄弱点失败");
      return (Array.isArray(data) ? data : []) as WeaknessItem[];
    },
  });
}

export function useAISelectWeakness() {
  return useMutation({
    mutationFn: async (chapterId: string) => {
      const { data, error } = await api.api["smart-select"].post({
        weakPointId: chapterId,
      });
      if (error) throw new Error(typeof error.value === "string" ? error.value : "AI 选题失败");
      return data as SmartSelectResult;
    },
    onError: (err) => handleApiError(err, "AI 选题失败"),
  });
}
