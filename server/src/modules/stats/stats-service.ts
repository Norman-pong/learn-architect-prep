import path from "node:path";
import { getDb } from "../../db";
import { loadQuestions } from "./quiz-service";

export interface ChapterStats {
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number; // 0-100
  rank?: number;
}

export interface KnowledgePointStats {
  knowledgePointId: string;
  knowledgePointName: string;
  chapterId: string;
  chapterName: string;
  total: number;
  correct: number;
  accuracy: number; // 0-100
  weak: boolean;
}

export interface DailyTrend {
  date: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface ChapterMeta {
  id: string;
  title: string;
}

interface KnowledgePointMeta {
  id: string;
  title: string;
  chapterId: string;
}

let cachedChapters: Map<string, ChapterMeta> | null = null;
let cachedKnowledgePoints: Map<string, KnowledgePointMeta> | null = null;

function toDateString(iso: string): string {
  return iso.slice(0, 10);
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateString(d.toISOString());
}

function buildWhereClause(
  userId: string,
  since?: string,
): {
  where: string;
  params: (string | number)[];
} {
  if (since) {
    return {
      where: "WHERE user_id = ? AND created_at >= ?",
      params: [userId, `${since}T00:00:00.000Z`],
    };
  }
  return { where: "WHERE user_id = ?", params: [userId] };
}

async function loadChapterMap(): Promise<Map<string, ChapterMeta>> {
  if (cachedChapters) return cachedChapters;
  const file = path.resolve(import.meta.dir, "../../../data/knowledge/index.json");
  const raw = await Bun.file(file).json();
  const map = new Map<string, ChapterMeta>();
  for (const ch of raw.chapters) {
    map.set(ch.id, { id: ch.id, title: ch.title });
  }
  cachedChapters = map;
  return map;
}

async function loadKnowledgePointMap(): Promise<Map<string, KnowledgePointMeta>> {
  if (cachedKnowledgePoints) return cachedKnowledgePoints;
  const base = path.resolve(import.meta.dir, "../../../data/knowledge");
  const map = new Map<string, KnowledgePointMeta>();
  const indexFile = path.join(base, "index.json");
  const raw = await Bun.file(indexFile).json();

  for (const ch of raw.chapters) {
    const chapterIndexFile = path.join(base, ch.id, "index.json");
    try {
      const chapterIndex = await Bun.file(chapterIndexFile).json();
      for (const kp of chapterIndex.knowledgePoints) {
        map.set(kp.id, {
          id: kp.id,
          title: kp.title,
          chapterId: ch.id,
        });
      }
    } catch {
      // 章节索引缺失时跳过
    }
  }

  cachedKnowledgePoints = map;
  return map;
}

function questionIdToChapterMap(): Promise<Map<string, string>> {
  return loadQuestions().then((questions) => {
    const map = new Map<string, string>();
    for (const q of questions) {
      map.set(q.id, q.chapter);
    }
    return map;
  });
}

function questionIdToKnowledgePointMap(): Promise<Map<string, string>> {
  return loadQuestions().then((questions) => {
    const map = new Map<string, string>();
    for (const q of questions) {
      // 题目 chapter 形如 "2.1"，对应知识点 id "kp-02-01"
      const parts = q.chapter.split(".");
      if (parts.length === 2) {
        const chapterNum = Number(parts[0]);
        const pointNum = Number(parts[1]);
        if (!Number.isNaN(chapterNum) && !Number.isNaN(pointNum)) {
          const id = `kp-${String(chapterNum).padStart(2, "0")}-${String(pointNum).padStart(2, "0")}`;
          map.set(q.id, id);
        }
      }
    }
    return map;
  });
}

export async function getStatsByChapter(userId: string, days?: number): Promise<ChapterStats[]> {
  const db = getDb();
  const since = days ? getDaysAgo(days) : undefined;
  const { where, params } = buildWhereClause(userId, since);

  const rows = db
    .query<{ question_id: string; is_correct: number }, (string | number)[]>(
      `SELECT question_id, is_correct FROM quiz_records ${where}`,
    )
    .all(...params);

  const chapterMap = await loadChapterMap();
  const questionChapterMap = await questionIdToChapterMap();

  const grouped = new Map<string, { total: number; correct: number }>();

  for (const row of rows) {
    const chapterId = questionChapterMap.get(row.question_id) ?? "unknown";
    const entry = grouped.get(chapterId) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    grouped.set(chapterId, entry);
  }

  const result: ChapterStats[] = [];
  for (const [chapterId, { total, correct }] of grouped) {
    const chapterName = chapterMap.get(chapterId)?.title ?? `章节 ${chapterId}`;
    result.push({
      chapterId,
      chapterName,
      total,
      correct,
      accuracy: total === 0 ? 0 : Math.round((correct / total) * 1000) / 10,
    });
  }

  result.sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);

  // 排名：做题数降序，同分按准确率降序
  const ranked = [...result].toSorted(
    (a: ChapterStats, b: ChapterStats) => b.total - a.total || b.accuracy - a.accuracy,
  );
  const rankMap = new Map<string, number>();
  for (let i = 0; i < ranked.length; i++) {
    rankMap.set(ranked[i].chapterId, i + 1);
  }
  for (const item of result) {
    item.rank = rankMap.get(item.chapterId);
  }

  return result;
}

export async function getStatsByKnowledgePoint(
  userId: string,
  days?: number,
): Promise<KnowledgePointStats[]> {
  const db = getDb();
  const since = days ? getDaysAgo(days) : undefined;
  const { where, params } = buildWhereClause(userId, since);

  const rows = db
    .query<{ question_id: string; is_correct: number }, (string | number)[]>(
      `SELECT question_id, is_correct FROM quiz_records ${where}`,
    )
    .all(...params);

  const chapterMap = await loadChapterMap();
  const knowledgePointMap = await loadKnowledgePointMap();
  const questionKnowledgePointMap = await questionIdToKnowledgePointMap();

  const grouped = new Map<string, { total: number; correct: number }>();

  for (const row of rows) {
    const kpId = questionKnowledgePointMap.get(row.question_id) ?? "unknown";
    const entry = grouped.get(kpId) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    grouped.set(kpId, entry);
  }

  const result: KnowledgePointStats[] = [];
  for (const [kpId, { total, correct }] of grouped) {
    const kp = knowledgePointMap.get(kpId);
    const chapterName = kp ? (chapterMap.get(kp.chapterId)?.title ?? "未分类") : "未分类";
    const accuracy = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
    result.push({
      knowledgePointId: kpId,
      knowledgePointName: kp?.title ?? `知识点 ${kpId}`,
      chapterId: kp?.chapterId ?? "unknown",
      chapterName,
      total,
      correct,
      accuracy,
      weak: accuracy < 60,
    });
  }

  // 薄弱度排序：正确率升序，相同则按做题数降序
  result.sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  return result;
}

export async function getTrends(userId: string, days = 30): Promise<DailyTrend[]> {
  const db = getDb();
  const since = getDaysAgo(days - 1);
  const { where, params } = buildWhereClause(userId, since);

  const rows = db
    .query<{ created_at: string; is_correct: number }, (string | number)[]>(
      `SELECT created_at, is_correct FROM quiz_records ${where} ORDER BY created_at ASC`,
    )
    .all(...params);

  const grouped = new Map<string, { total: number; correct: number }>();

  for (const row of rows) {
    const date = toDateString(row.created_at);
    const entry = grouped.get(date) ?? { total: 0, correct: 0 };
    entry.total += 1;
    if (row.is_correct) entry.correct += 1;
    grouped.set(date, entry);
  }

  // 补全最近 days 天，无数据为 0
  const result: DailyTrend[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = toDateString(d.toISOString());
    const { total = 0, correct = 0 } = grouped.get(date) ?? {};
    result.push({
      date,
      total,
      correct,
      accuracy: total === 0 ? 0 : Math.round((correct / total) * 1000) / 10,
    });
  }

  return result;
}
