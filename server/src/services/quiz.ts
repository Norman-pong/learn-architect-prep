import path from "node:path";
import { createHash } from "node:crypto";
import { getDb } from "../db";

export interface CaseQuestion {
  id: string;
  question: string;
  referenceAnswer: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  hash: string;
  year: number;
}

export interface PublicQuestion {
  id: string;
  question: string;
  options: Record<string, string>;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
}

const QUIZ_DIR = path.resolve(import.meta.dir, "../../../data/quiz");
const QUESTIONS_FILE = path.join(QUIZ_DIR, "questions.json");

let cachedQuestions: QuizQuestion[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5_000;

let cachedCaseQuestions: CaseQuestion[] | null = null;
let caseCacheTime = 0;

function ensureOptionsShape(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "string") {
        out[key] = value;
      }
    }
  }
  return out;
}

function normalizeQuestion(item: unknown): QuizQuestion | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const id = String(raw.id ?? "");
  const question = String(raw.question ?? "");
  const answer = String(raw.answer ?? "")
    .trim()
    .toUpperCase();
  const explanation = String(raw.explanation ?? "");
  const chapter = String(raw.chapter ?? "");
  const difficulty = String(raw.difficulty ?? "medium");
  const source = String(raw.source ?? "自建");
  const year = Number(raw.year ?? 2024);

  if (!id || !question || !answer || !chapter) return null;
  if (!["easy", "medium", "hard"].includes(difficulty)) return null;

  const options = ensureOptionsShape(raw.options);
  if (!options.A || !options.B) return null;

  const hashContent = `${question}|${answer}|${explanation}|${chapter}`;
  const hash = createHash("sha256").update(hashContent).digest("hex");

  return {
    id,
    question,
    options,
    answer,
    explanation,
    chapter,
    difficulty: difficulty as QuizQuestion["difficulty"],
    source,
    hash: String(raw.hash ?? hash),
    year,
  };
}

export async function loadQuestions(): Promise<QuizQuestion[]> {
  if (cachedQuestions && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedQuestions;
  }
  const file = Bun.file(QUESTIONS_FILE);
  if (!(await file.exists())) {
    cachedQuestions = [];
    cacheTime = Date.now();
    return cachedQuestions;
  }
  try {
    const raw = (await file.json()) as unknown;
    if (Array.isArray(raw)) {
      cachedQuestions = raw.map(normalizeQuestion).filter((q): q is QuizQuestion => q !== null);
    } else if (raw && typeof raw === "object") {
      const list = (raw as Record<string, unknown>).questions;
      const arr = Array.isArray(list) ? list : [];
      cachedQuestions = arr.map(normalizeQuestion).filter((q): q is QuizQuestion => q !== null);
    } else {
      cachedQuestions = [];
    }
  } catch {
    cachedQuestions = [];
  }
  cacheTime = Date.now();
  return cachedQuestions;
}

export interface QuestionFilter {
  chapter?: string;
  count?: number;
  mode?: "chapter" | "random" | "error";
  excludeIds?: string[];
}

export function toPublicQuestion(q: QuizQuestion): PublicQuestion {
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    chapter: q.chapter,
    difficulty: q.difficulty,
    source: q.source,
    year: q.year,
  };
}

export async function getQuestions(
  userId: string,
  filter: QuestionFilter,
): Promise<PublicQuestion[]> {
  const all = await loadQuestions();
  const mode = filter.mode ?? "random";
  const count = Math.min(filter.count ?? 20, 200);

  let pool: QuizQuestion[] = [];
  if (mode === "chapter") {
    if (filter.chapter) {
      pool = all.filter((q) => q.chapter === filter.chapter);
    } else {
      pool = all.slice();
    }
  } else if (mode === "error") {
    const errorIds = await getUserErrorQuestionIds(userId);
    pool = all.filter((q) => errorIds.has(q.id));
  } else {
    pool = all.slice();
  }

  if (filter.excludeIds?.length) {
    const excludeSet = new Set(filter.excludeIds);
    pool = pool.filter((q) => !excludeSet.has(q.id));
  }

  if (pool.length === 0) return [];

  const selected = shuffle(pool).slice(0, count);
  return selected.map(toPublicQuestion);
}

export async function getQuestionById(questionId: string): Promise<QuizQuestion | null> {
  const all = await loadQuestions();
  return all.find((q) => q.id === questionId) ?? null;
}

export async function recordAnswer(
  userId: string,
  questionId: string,
  selectedAnswer: string,
): Promise<{ isCorrect: boolean; correctAnswer: string; explanation: string } | null> {
  const question = await getQuestionById(questionId);
  if (!question) return null;

  const isCorrect = selectedAnswer.trim().toUpperCase() === question.answer.trim().toUpperCase();
  const db = getDb();
  const id = createHash("sha256").update(`${userId}:${questionId}:${Date.now()}`).digest("hex");
  db.run(
    `INSERT INTO quiz_records (id, user_id, question_id, selected_answer, is_correct, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [id, userId, questionId, selectedAnswer, isCorrect ? 1 : 0, new Date().toISOString()],
  );
  return {
    isCorrect,
    correctAnswer: question.answer,
    explanation: question.explanation,
  };
}

export async function getUserErrorQuestionIds(userId: string): Promise<Set<string>> {
  const db = getDb();
  const rows = db
    .query<{ question_id: string; is_correct: number }, [string]>(
      `SELECT question_id, is_correct
       FROM quiz_records
       WHERE user_id = ?
       ORDER BY created_at DESC;`,
    )
    .all(userId);

  const latestCorrect = new Map<string, boolean>();
  for (const row of rows) {
    if (!latestCorrect.has(row.question_id)) {
      latestCorrect.set(row.question_id, row.is_correct === 1);
    }
  }

  const errorIds = new Set<string>();
  for (const [qid, correct] of latestCorrect.entries()) {
    if (!correct) errorIds.add(qid);
  }
  return errorIds;
}

export async function getUserErrorQuestions(userId: string): Promise<PublicQuestion[]> {
  const all = await loadQuestions();
  const errorIds = await getUserErrorQuestionIds(userId);
  return all.filter((q) => errorIds.has(q.id)).map(toPublicQuestion);
}

function normalizeCaseQuestion(item: unknown): CaseQuestion | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const id = String(raw.id ?? "");
  const question = String(raw.question ?? "");
  const referenceAnswer = String(raw.referenceAnswer ?? "");
  const chapter = String(raw.chapter ?? "");
  const difficulty = String(raw.difficulty ?? "medium");
  const source = String(raw.source ?? "自建");
  const year = Number(raw.year ?? 2024);

  if (!id || !question || !referenceAnswer || !chapter) return null;
  if (!["easy", "medium", "hard"].includes(difficulty)) return null;

  return {
    id,
    question,
    referenceAnswer,
    chapter,
    difficulty: difficulty as CaseQuestion["difficulty"],
    source,
    year,
  };
}

const CASES_FILE = path.join(QUIZ_DIR, "cases.json");

export async function loadCaseQuestions(): Promise<CaseQuestion[]> {
  if (cachedCaseQuestions && Date.now() - caseCacheTime < CACHE_TTL_MS) {
    return cachedCaseQuestions;
  }
  const file = Bun.file(CASES_FILE);
  if (!(await file.exists())) {
    cachedCaseQuestions = [];
    caseCacheTime = Date.now();
    return cachedCaseQuestions;
  }
  try {
    const raw = (await file.json()) as unknown;
    if (raw && typeof raw === "object") {
      const list = (raw as Record<string, unknown>).cases;
      const arr = Array.isArray(list) ? list : [];
      cachedCaseQuestions = arr
        .map(normalizeCaseQuestion)
        .filter((q): q is CaseQuestion => q !== null);
    } else {
      cachedCaseQuestions = [];
    }
  } catch {
    cachedCaseQuestions = [];
  }
  caseCacheTime = Date.now();
  return cachedCaseQuestions;
}

function shuffle<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
