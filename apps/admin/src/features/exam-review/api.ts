import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getEdenError } from "../../lib/api";
import type {
  ExamConfig,
  ActiveExam,
  CompPaper,
  CasePaper,
  EssayPaper,
  CompReport,
  CaseReport,
  EssayReport,
  ReviewCard,
} from "./types";
import type { ThesisSections } from "@archprep/shared";

function handleApiError(err: unknown, fallback: string): Error {
  const message = err instanceof Error ? err.message : fallback;
  toast.error(message);
  return new Error(message);
}

/* ── Query keys ── */

export const examConfigKey = ["exam", "config"];
export const examStatusKey = ["exam", "status"];
export const compPaperKey = (examId: string) => ["exam", "comp", "paper", examId];
export const casePaperKey = (examId: string) => ["exam", "case", "paper", examId];
export const essayPaperKey = (examId: string) => ["exam", "essay", "paper", examId];
export const compReportKey = (examId: string) => ["exam", "comp", "report", examId];
export const caseReportKey = (examId: string) => ["exam", "case", "report", examId];
export const essayReportKey = (examId: string) => ["exam", "essay", "report", examId];
export const reviewQueueKey = ["review", "queue"];

/* ── Exam config ── */

export function useExamConfigs() {
  return useQuery({
    queryKey: examConfigKey,
    queryFn: async () => {
      const { data, error } = await api.api.exam.config.get();
      if (error) throw new Error(getEdenError(error, "获取考试配置失败"));
      return data as ExamConfig[];
    },
  });
}

export function useExamStatus() {
  return useQuery({
    queryKey: examStatusKey,
    queryFn: async () => {
      const { data, error } = await api.api.exam.status.get();
      if (error) throw new Error(getEdenError(error, "获取考试状态失败"));
      const status = data as { active: ActiveExam | null };
      return status.active;
    },
  });
}

/* ── Start / pause / resume / finish ── */

export function useStartExam() {
  return useMutation({
    mutationFn: async (body: { examType: string; mode: string }) => {
      const { data, error } = await api.api.exam.start.post(body);
      if (error) throw new Error(getEdenError(error, "启动考试失败"));
      return data as ActiveExam;
    },
    onError: (err) => handleApiError(err, "启动考试失败"),
  });
}

export function usePauseExam() {
  return useMutation({
    mutationFn: async (body: {
      examId: string;
      remainingTime: number;
      answersSnapshot: Record<string, unknown>;
    }) => {
      const { data, error } = await api.api.exam.pause.post(body);
      if (error) throw new Error(getEdenError(error, "暂停失败"));
      return data as { id: string; status: string; remainingTime: number };
    },
    onError: (err) => handleApiError(err, "暂停失败"),
  });
}

export function useResumeExam() {
  return useMutation({
    mutationFn: async (body: { examId: string }) => {
      const { data, error } = await api.api.exam.resume.post(body);
      if (error) throw new Error(getEdenError(error, "继续失败"));
      return data as ActiveExam;
    },
    onError: (err) => handleApiError(err, "继续失败"),
  });
}

export function useFinishExam() {
  return useMutation({
    mutationFn: async (body: { examId: string; answersSnapshot: Record<string, unknown> }) => {
      const { data, error } = await api.api.exam.finish.post(body);
      if (error) throw new Error(getEdenError(error, "提交失败"));
      return data as { id: string; status: string; score: number | null; finishedAt: string };
    },
    onError: (err) => handleApiError(err, "提交失败"),
  });
}

/* ── Comprehensive exam ── */

export function useCompPaper(examId: string | undefined) {
  return useQuery({
    queryKey: compPaperKey(examId ?? ""),
    queryFn: async () => {
      if (!examId) throw new Error("missing examId");
      const { data, error } = await api.api.exam.comp.paper.get({ query: { examId } });
      if (error) throw new Error(getEdenError(error, "加载试卷失败"));
      return data as CompPaper;
    },
    enabled: !!examId,
  });
}

export function useSubmitCompAnswer() {
  return useMutation({
    mutationFn: async (body: { examId: string; questionId: string; answer: string }) => {
      const { data, error } = await api.api.exam.comp.submit.post(body);
      if (error) throw new Error(getEdenError(error, "提交答案失败"));
      return data as { success: boolean };
    },
  });
}

export function useFinishCompExam() {
  return useMutation({
    mutationFn: async (body: { examId: string }) => {
      const { data, error } = await api.api.exam.comp.finish.post(body);
      if (error) throw new Error(getEdenError(error, "提交失败"));
      return data as CompReport;
    },
    onError: (err) => handleApiError(err, "提交失败"),
  });
}

export function useCompReport(examId: string | undefined) {
  return useQuery({
    queryKey: compReportKey(examId ?? ""),
    queryFn: async () => {
      if (!examId) throw new Error("missing examId");
      const { data, error } = await api.api.exam.comp.report.get({ query: { examId } });
      if (error) throw new Error(getEdenError(error, "获取报告失败"));
      return data as CompReport;
    },
    enabled: !!examId,
  });
}

/* ── Case exam ── */

export function useCasePaper(examId: string | undefined) {
  return useQuery({
    queryKey: casePaperKey(examId ?? ""),
    queryFn: async () => {
      if (!examId) throw new Error("missing examId");
      const { data, error } = await api.api.exam.case.paper.get({ query: { examId } });
      if (error) throw new Error(getEdenError(error, "加载试卷失败"));
      return data as CasePaper;
    },
    enabled: !!examId,
  });
}

export function useSubmitCaseAnswer() {
  return useMutation({
    mutationFn: async (body: {
      examId: string;
      questionId: string;
      answer: string;
      mermaid?: string;
    }) => {
      const { data, error } = await api.api.exam.case.submit.post(body);
      if (error) throw new Error(getEdenError(error, "提交答案失败"));
      return data as { success: boolean };
    },
  });
}

export function useFinishCaseExam() {
  return useMutation({
    mutationFn: async (body: { examId: string }) => {
      const { data, error } = await api.api.exam.case.finish.post(body);
      if (error) throw new Error(getEdenError(error, "提交失败"));
      return data as CaseReport;
    },
    onError: (err) => handleApiError(err, "提交失败"),
  });
}

/* ── Essay exam ── */

export function useEssayPaper(examId: string | undefined) {
  return useQuery({
    queryKey: essayPaperKey(examId ?? ""),
    queryFn: async () => {
      if (!examId) throw new Error("missing examId");
      const { data, error } = await api.api.exam.essay.paper.get({ query: { examId } });
      if (error) throw new Error(getEdenError(error, "加载试卷失败"));
      return data as EssayPaper;
    },
    enabled: !!examId,
  });
}

export function useSubmitEssay() {
  return useMutation({
    mutationFn: async (body: {
      examId: string;
      selectedQuestionId: string;
      sections: ThesisSections;
    }) => {
      const { data, error } = await api.api.exam.essay.submit.post(body);
      if (error) throw new Error(getEdenError(error, "保存失败"));
      return data as { success: boolean };
    },
  });
}

export function useFinishEssayExam() {
  return useMutation({
    mutationFn: async (body: { examId: string }) => {
      const { data, error } = await api.api.exam.essay.finish.post(body);
      if (error) throw new Error(getEdenError(error, "提交失败"));
      return data as EssayReport;
    },
    onError: (err) => handleApiError(err, "提交失败"),
  });
}

/* ── Review ── */

export function useReviewQueue() {
  return useQuery({
    queryKey: reviewQueueKey,
    queryFn: async () => {
      const { data, error } = await api.api.review.due.get();
      if (error) throw new Error(getEdenError(error, "加载复习队列失败"));
      return data as ReviewCard[];
    },
  });
}

export function useRateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { cardId: string; score: number }) => {
      const { data, error } = await api.api.review.rate.post(body);
      if (error) throw new Error(getEdenError(error, "提交评分失败"));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewQueueKey });
    },
    onError: (err) => handleApiError(err, "提交评分失败"),
  });
}
