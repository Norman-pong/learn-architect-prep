/* ── Exam mode / type ── */

export type ExamType = "comprehensive" | "case" | "essay" | "full";
export type ExamMode = "single" | "full";

export interface ExamConfig {
  examType: Exclude<ExamType, "full">;
  questionCount: number;
  duration: number;
  chooseCount?: number;
}

export interface ActiveExam {
  id: string;
  examType: ExamType;
  mode: ExamMode;
  status: string;
  duration: number;
  remainingTime: number;
  answersSnapshot: Record<string, unknown>;
  startedAt: string;
}

/* ── Question types ── */

export interface CompQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: string;
  source: string;
  year: number | null;
}

export interface CaseQuestion {
  id: string;
  question: string;
  referenceAnswer: string;
  chapter: string;
  difficulty: string;
  source: string;
  year: number;
}

export interface EssayQuestion {
  id: string;
  title: string;
  requirements: string[];
  referenceOutline?: string;
  source: string;
  year: number | null;
  hash: string;
}

/* ── Paper types ── */

export interface CompPaper {
  examId: string;
  questions: CompQuestion[];
  duration: number;
  remainingTime: number;
}

export interface CasePaper {
  examId: string;
  questions: CaseQuestion[];
  duration: number;
  remainingTime: number;
}

export interface EssayPaper {
  examId: string;
  questions: EssayQuestion[];
  duration: number;
  remainingTime: number;
}

/* ── Answer types ── */

export interface CaseAnswer {
  answer: string;
  mermaid?: string;
}

/* ── Dimension / report shared ── */

export interface Dimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  comment: string;
}

export interface SectionFeedback {
  section: string;
  comment: string;
  suggestions: string[];
}

export interface Deduction {
  reason: string;
  severity: "minor" | "major" | "critical";
  suggestion: string;
}

/* ── Report types ── */

export interface ChapterStat {
  chapter: string;
  total: number;
  correct: number;
  rate: number;
}

export interface WrongQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  correctAnswer: string;
  userAnswer: string;
  explanation: string;
}

export interface CompReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number;
  chapterDistribution: ChapterStat[];
  wrongQuestions: WrongQuestion[];
}

export interface CaseReport {
  examId: string;
  score: number;
  maxTotalScore: number;
  passLine: number;
  passed: boolean;
  dimensions: Dimension[];
  overallComment: string;
  improvementSuggestions: string[];
  answers: Record<string, CaseAnswer>;
}

export interface EssayReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number;
  writingId: string;
  selectedQuestionId: string;
  dimensions: Dimension[];
  sectionFeedbacks: SectionFeedback[];
  deductions: Deduction[];
  overallComment: string;
  improvementSuggestions: string[];
}

/* ── Review types ── */

export interface ReviewCard {
  cardId: string;
  userId: string;
  knowledgePointId: string;
  ease: number;
  interval: number;
  dueDate: string;
  reps: number;
  lapses: number;
  title: string;
  content: string;
  examWeight: number;
  chapterId: string;
  chapterTitle: string;
}

/* ── AI scoring stream ── */

export type AiScoreEvent =
  | { type: "chunk"; data: string }
  | { type: "done"; data: unknown }
  | { type: "error"; message: string };

/* ── Timer state ── */

export interface TimerState {
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
}

/* ── Nav item for answer sheet ── */

export interface AnswerNavItem {
  key: number;
  label: string;
  answered: boolean;
}
