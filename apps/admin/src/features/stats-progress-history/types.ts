export interface ChapterStats {
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number;
  rank?: number;
}

export interface KnowledgePointStats {
  knowledgePointId: string;
  knowledgePointName: string;
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number;
  weak: boolean;
}

export interface DailyTrend {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface HeatmapDay {
  date: string;
  count: number;
  duration: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapData {
  year: number;
  days: HeatmapDay[];
  totalActiveDays: number;
  totalCount: number;
  totalDuration: number;
}

export interface CalendarSession {
  sessionId: string;
  chapterId: string | null;
  duration: number;
}

export interface CalendarDay {
  date: string;
  count: number;
  duration: number;
  sessions: CalendarSession[];
}

export interface CalendarData {
  month: string;
  days: CalendarDay[];
}

export interface ChapterProgress {
  chapterId: string;
  chapterTitle: string;
  section: string;
  totalKnowledgePoints: number;
  studiedKnowledgePoints: number;
  completionRate: number;
  totalReviews: number;
  averageEase: number;
  masteryRate: number;
  examWeight: number;
}

export type ExamType = "comprehensive" | "case" | "essay";

export interface ExamRecord {
  id: string;
  examType: string;
  mode: string;
  status: string;
  score: number | null;
  duration: number;
  startedAt: string;
  finishedAt: string | null;
  passed: boolean | null;
}

export interface ScoreTrendPoint {
  date: string;
  score: number;
  passed: boolean;
}

export interface ExamTypeTrend {
  examType: ExamType;
  examTypeLabel: string;
  points: ScoreTrendPoint[];
  bestScore: number | null;
  latestScore: number | null;
  latestPassed: boolean | null;
  attemptCount: number;
  passedCount: number;
}

export interface HistoryResponse {
  items: ExamRecord[];
  passScore: number;
  examTypeLabels: Record<string, string>;
  modeLabels: Record<string, string>;
}

export interface TrendsResponse {
  rangeStart: string;
  rangeEnd: string;
  passScore: number;
  total: ExamTypeTrend[];
}
