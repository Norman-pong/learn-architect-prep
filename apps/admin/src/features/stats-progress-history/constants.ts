export const DAYS_OPTIONS = [
  { label: "全部", value: "" },
  { label: "近 7 天", value: "7" },
  { label: "近 30 天", value: "30" },
  { label: "近 90 天", value: "90" },
];

export const EXAM_FILTER_OPTIONS = [
  { label: "全部科目", value: "" },
  { label: "综合知识", value: "comprehensive" },
  { label: "案例分析", value: "case" },
  { label: "论文", value: "essay" },
];

export const RANGE_OPTIONS = [
  { label: "近 30 天", value: "30" },
  { label: "近 90 天", value: "90" },
  { label: "近 180 天", value: "180" },
  { label: "近 365 天", value: "365" },
];

export const STATUS_TAG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  finished: { label: "已完成", variant: "default" },
  in_progress: { label: "进行中", variant: "secondary" },
  paused: { label: "已暂停", variant: "outline" },
  abandoned: { label: "已弃考", variant: "destructive" },
};

export const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

// GitHub-style palette: light mode
export const HEAT_LEVEL_BG_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
// Dark mode palette (brighter, lower-eye-strain)
export const HEAT_LEVEL_BG_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
