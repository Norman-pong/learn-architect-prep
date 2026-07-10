import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CalendarData,
  ChapterProgress,
  ChapterStats,
  DailyTrend,
  HeatmapData,
  HistoryResponse,
  KnowledgePointStats,
  TrendsResponse,
} from "./types";

export function useChapterStats(days: string) {
  return useQuery<ChapterStats[]>({
    queryKey: ["stats", "chapter", days],
    queryFn: async () => {
      const { data } = await api.api.stats.chapter.get({ query: { days } });
      return data as ChapterStats[];
    },
  });
}

export function useKnowledgePointStats(days: string) {
  return useQuery<KnowledgePointStats[]>({
    queryKey: ["stats", "knowledge-point", days],
    queryFn: async () => {
      const { data } = await api.api.stats["knowledge-point"].get({ query: { days } });
      return data as KnowledgePointStats[];
    },
  });
}

export function useDailyTrends(days: string) {
  return useQuery<DailyTrend[]>({
    queryKey: ["stats", "trends", days],
    queryFn: async () => {
      const { data } = await api.api.stats.trends.get({ query: { days } });
      return data as DailyTrend[];
    },
  });
}

export function useHeatmap(year: number) {
  return useQuery<HeatmapData>({
    queryKey: ["progress", "heatmap", year],
    queryFn: async () => {
      const { data } = await api.api.progress.heatmap.get({ query: { year: String(year) } });
      return data as HeatmapData;
    },
  });
}

export function useCalendar(month: string) {
  return useQuery<CalendarData>({
    queryKey: ["progress", "calendar", month],
    queryFn: async () => {
      const { data } = await api.api.progress.calendar.get({ query: { month } });
      return data as CalendarData;
    },
  });
}

export function useChapterProgress() {
  return useQuery<ChapterProgress[]>({
    queryKey: ["progress", "chapters"],
    queryFn: async () => {
      const { data } = await api.api.progress.chapters.get();
      return data as ChapterProgress[];
    },
  });
}

export function useExamHistory(examType: string, days: string) {
  return useQuery<HistoryResponse>({
    queryKey: ["exam-history", examType, days],
    queryFn: async () => {
      // Server accepts only examType/limit; days is kept in the query key for cache granularity.
      const { data } = await api.api["exam-history"].get({ query: { examType } });
      return data as HistoryResponse;
    },
  });
}

export function useExamTrends(examType: string, days: string) {
  return useQuery<TrendsResponse>({
    queryKey: ["exam-history", "trends", examType, days],
    queryFn: async () => {
      const { data } = await api.api["exam-history"].trends.get({ query: { examType, days } });
      return data as TrendsResponse;
    },
  });
}
