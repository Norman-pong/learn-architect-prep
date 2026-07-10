import type { ExamType, ExamMode } from "./types";

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  comprehensive: "综合知识",
  case: "案例分析",
  essay: "论文",
  full: "全模块",
};

export const EXAM_TYPE_DESC: Record<ExamType, string> = {
  comprehensive: "75 题单选，150 分钟",
  case: "5 选 4 主观题，90 分钟",
  essay: "4 选 1 写作，120 分钟",
  full: "综合 + 案例连续 240 分钟，论文单独 120 分钟",
};

export const MODE_LABEL: Record<ExamMode, string> = {
  single: "单模块",
  full: "全模块",
};

export const TOTAL_COMP_QUESTIONS = 75;
export const CASE_CHOOSE_COUNT = 4;

export const RATING_LABELS = ["完全遗忘", "模糊", "勉强想起", "困难", "良好", "简单"];

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
