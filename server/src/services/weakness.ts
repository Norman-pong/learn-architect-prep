import path from "node:path";
import { getDb } from "../db";
import { loadQuestions } from "./quiz";

const KNOWLEDGE_DIR = path.resolve(import.meta.dir, "../../../data/knowledge");

export interface WeakPoint {
  chapterId: string;
  chapterName: string;
  section: string;
  correctRate: number;
  totalQuestions: number;
  correctCount: number;
  isWeak: boolean;
  examWeight: number;
}

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
}

let cachedChapters: ChapterMeta[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 60_000;

async function loadChapters(): Promise<ChapterMeta[]> {
  if (cachedChapters && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedChapters;
  }
  const file = Bun.file(path.join(KNOWLEDGE_DIR, "index.json"));
  if (!(await file.exists())) {
    cachedChapters = [];
    cacheTime = Date.now();
    return cachedChapters;
  }
  try {
    const raw = (await file.json()) as { chapters: ChapterMeta[] };
    cachedChapters = raw.chapters ?? [];
  } catch {
    cachedChapters = [];
  }
  cacheTime = Date.now();
  return cachedChapters;
}

function normalizeChapterId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("ch")) return trimmed;
  const parts = trimmed.split(".");
  const main = parts[0].replace(/^0+/, "") || "0";
  return `ch${main.padStart(2, "0")}`;
}

function chapterIdToDisplay(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("ch")) {
    const num = trimmed.slice(2).replace(/^0+/, "") || "0";
    return num;
  }
  return trimmed;
}

export async function getWeakPoints(userId: string): Promise<WeakPoint[]> {
  const db = getDb();
  const rows = db
    .query<{ question_id: string; is_correct: number }, [string]>(
      `SELECT question_id, is_correct
       FROM quiz_records
       WHERE user_id = ?
       ORDER BY created_at DESC;`,
    )
    .all(userId);

  const questionIds = [...new Set(rows.map((r) => r.question_id))];
  if (questionIds.length === 0) return [];

  const allQuestions = await loadQuestions();
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  const statsByChapter = new Map<string, { correct: number; total: number }>();

  for (const row of rows) {
    const q = questionMap.get(row.question_id);
    if (!q) continue;
    const chId = normalizeChapterId(q.chapter);
    const s = statsByChapter.get(chId) ?? { correct: 0, total: 0 };
    s.total += 1;
    if (row.is_correct === 1) s.correct += 1;
    statsByChapter.set(chId, s);
  }

  const chapters = await loadChapters();
  const chapterMap = new Map(chapters.map((c) => [c.id, c]));

  const results: WeakPoint[] = [];
  for (const [chId, s] of statsByChapter.entries()) {
    const rate = s.total > 0 ? Math.round((s.correct / s.total) * 1000) / 10 : 0;
    const meta = chapterMap.get(chId);
    results.push({
      chapterId: chId,
      chapterName: meta?.title ?? `第${chapterIdToDisplay(chId)}章`,
      section: meta?.section ?? "",
      correctRate: rate,
      totalQuestions: s.total,
      correctCount: s.correct,
      isWeak: rate < 60,
      examWeight: meta?.examWeight ?? 0,
    });
  }

  results.sort((a, b) => a.correctRate - b.correctRate);
  return results;
}
