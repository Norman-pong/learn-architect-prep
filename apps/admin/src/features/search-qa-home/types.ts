export interface DashboardData {
  todayReviewCount: number;
  streakDays: number;
  weakPointCount: number;
  lastMockScore: number | null;
}

export interface RecommendItem {
  knowledgePointId: string;
  title: string;
  chapterId: string;
  correctRate: number;
  examWeight: number;
  score: number;
}

export interface SearchResult {
  kpId: string;
  title: string;
  chapterId: string;
  chapterName: string;
  snippet: string;
  highlights: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

export interface KnowledgePoint {
  id: string;
  title: string;
  examWeight: number;
  file: string;
}

export interface ChapterIndex {
  id: string;
  title: string;
  examWeight: number;
  knowledgePoints: KnowledgePoint[];
}
