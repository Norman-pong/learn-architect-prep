export interface Question {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
}

export interface SubmitResult {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
}

export interface ErrorBookItem {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  errorAt: string;
  mastered: boolean;
  masteredAt?: string;
}

export interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

export interface QuizBankStats {
  total: number;
  byChapter: { chapter: string; count: number }[];
  bySource: { source: string; count: number }[];
}

export interface QuizBankQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation?: string;
  chapter?: string;
  difficulty?: "easy" | "medium" | "hard";
  source?: string;
  hash?: string;
  year?: number | null;
}

export interface QuizBankImportResult {
  ok: boolean;
  added: number;
  skipped: number;
  failed: number;
  errors?: { reason: string }[];
}

export interface WeaknessItem {
  chapterId: string;
  chapterName: string;
  section: string;
  correctRate: number;
  totalQuestions: number;
  correctCount: number;
  isWeak: boolean;
}

export interface SmartSelectResult {
  questions: Question[];
  weakPoint: {
    chapterId: string;
    chapterName: string;
    correctRate: number;
  };
  source: "local" | "ai-assisted";
  reason: string;
}
