export const MODE_LABELS: Record<string, string> = {
  chapter: "章节练习",
  random: "随机练习",
  error: "错题重练",
};

export const OPTION_LABELS = ["A", "B", "C", "D"];

export const REPORT_TYPES = [
  { value: "content-error", label: "题干有误" },
  { value: "answer-error", label: "答案错误" },
  { value: "explanation-error", label: "解析不当" },
  { value: "other", label: "其他" },
];

export const DIFFICULTY_TAG: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const DIFFICULTY_BADGE_VARIANT: Record<string, string> = {
  easy: "success",
  medium: "warning",
  hard: "destructive",
} as const;
