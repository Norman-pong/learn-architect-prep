import path from "node:path";
import { getDb } from "../../db";

const KNOWLEDGE_DIR = path.resolve(import.meta.dir, "../../../data/knowledge");

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number; // 答题 + 复习次数（动作计数）
  duration: number; // 学习总时长（分钟，study_sessions.duration 之和）
  level: 0 | 1 | 2 | 3 | 4; // 强度分级 0=无, 1-4=渐增
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
  date: string; // YYYY-MM-DD
  count: number;
  duration: number;
  sessions: CalendarSession[];
}

export interface CalendarData {
  month: string; // YYYY-MM
  days: CalendarDay[];
}

export interface ChapterProgress {
  chapterId: string;
  chapterTitle: string;
  section: string;
  totalKnowledgePoints: number;
  studiedKnowledgePoints: number;
  completionRate: number; // 0-100
  totalReviews: number;
  averageEase: number;
  masteryRate: number; // 0-100 (reps >= 3 且 ease >= 2.5)
  examWeight: number;
}

interface ChapterMeta {
  id: string;
  title: string;
  section: string;
  examWeight: number;
  order: number;
  knowledgePoints: KnowledgePointLite[];
}

interface KnowledgePointLite {
  id: string;
}

let cachedChapters: ChapterMeta[] | null = null;
const CACHE_TTL_MS = 60_000;
let cacheTime = 0;

async function loadChapters(): Promise<ChapterMeta[]> {
  if (cachedChapters && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedChapters;
  }
  const indexFile = Bun.file(path.join(KNOWLEDGE_DIR, "index.json"));
  const result: ChapterMeta[] = [];
  if (await indexFile.exists()) {
    try {
      const raw: unknown = await indexFile.json();
      if (!isRecord(raw) || !Array.isArray(raw.chapters)) {
        return cachedChapters ?? [];
      }
      for (const ch of raw.chapters) {
        const chapterIdxFile = Bun.file(path.join(KNOWLEDGE_DIR, ch.id, "index.json"));
        let kps: KnowledgePointLite[] = [];
        if (await chapterIdxFile.exists()) {
          try {
            const chapterRaw: unknown = await chapterIdxFile.json();
            if (isRecord(chapterRaw) && Array.isArray(chapterRaw.knowledgePoints)) {
              kps = chapterRaw.knowledgePoints.filter(isRecord).map((kp) => ({
                id: typeof kp.id === "string" ? kp.id : "",
              }));
            }
          } catch {
            kps = [];
          }
        }
        result.push({
          id: ch.id,
          title: ch.title,
          section: ch.section,
          examWeight: ch.examWeight ?? 3,
          order: ch.order ?? 0,
          knowledgePoints: kps,
        });
      }
    } catch {
      // 索引解析失败：返回空数组
    }
  }
  cachedChapters = result;
  cacheTime = Date.now();
  return result;
}

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && year >= 1970 && year <= 9999;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidMonth(month: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(month)) return false;
  const mm = Number(month.slice(5, 7));
  return mm >= 1 && mm <= 12;
}

function daysInMonth(year: number, monthIdx: number): number {
  return new Date(year, monthIdx + 1, 0).getDate();
}

function intensityLevel(count: number, duration: number): 0 | 1 | 2 | 3 | 4 {
  // 综合分：count 权重 1，duration 权重 1（按 15 分钟为 1 单位）
  const score = count + Math.floor(duration / 15);
  if (score <= 0) return 0;
  if (score <= 2) return 1;
  if (score <= 5) return 2;
  if (score <= 10) return 3;
  return 4;
}

/**
 * 热力图：按年聚合每日学习强度。
 * 数据源：
 *   - study_sessions.date / duration（学习时长）
 *   - quiz_records.created_at（每日答题次数）
 *   - review_cards.due_date（每日复习次数，本期按 reps>0 的卡片按 due_date 估算）
 *     → 简化策略：复习次数 = 该用户当日 processReview 后的 due_date 记录不易追踪，
 *       改为对 review_cards 中 due_date 进行"今日到期/已到期"统计，每天新出现的卡片也算入
 */
export async function getHeatmapData(userId: string, year: number): Promise<HeatmapData> {
  const db = getDb();

  if (!isValidYear(year)) {
    return { year, days: [], totalActiveDays: 0, totalCount: 0, totalDuration: 0 };
  }

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  // 学习时长（study_sessions）
  type SessionRow = { date: string; duration: number; count: number };
  const sessionRows = db
    .query<SessionRow, [string, string, string]>(
      `SELECT date, SUM(duration) AS duration, COUNT(*) AS count
       FROM study_sessions
       WHERE user_id = ? AND date BETWEEN ? AND ?
       GROUP BY date;`,
    )
    .all(userId, start, end);

  // 答题次数（quiz_records.created_at）
  type QuizRow = { date: string; count: number };
  const quizRows = db
    .query<QuizRow, [string, string, string]>(
      `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count
       FROM quiz_records
       WHERE user_id = ? AND substr(created_at, 1, 10) BETWEEN ? AND ?
       GROUP BY date;`,
    )
    .all(userId, start, end);

  // 复习次数：以 due_date 表示"该卡片此日到期复习"
  // 即每张卡片（reps>0）算一次当日复习事件
  type ReviewRow = { date: string; count: number };
  const reviewRows = db
    .query<ReviewRow, [string, string, string]>(
      `SELECT due_date AS date, COUNT(*) AS count
       FROM review_cards
       WHERE user_id = ? AND reps > 0 AND due_date BETWEEN ? AND ?
       GROUP BY due_date;`,
    )
    .all(userId, start, end);

  const dayMap = new Map<string, { count: number; duration: number }>();

  const upsert = (date: string, deltaCount: number, deltaDuration: number) => {
    const entry = dayMap.get(date) ?? { count: 0, duration: 0 };
    entry.count += deltaCount;
    entry.duration += deltaDuration;
    dayMap.set(date, entry);
  };

  for (const r of sessionRows) upsert(r.date, 0, r.duration);
  for (const r of sessionRows) upsert(r.date, r.count, 0); // session count（一次会话 = 一个动作）
  for (const r of quizRows) upsert(r.date, r.count, 0);
  for (const r of reviewRows) upsert(r.date, r.count, 0);

  // 生成全年（含补零）
  const days: HeatmapDay[] = [];
  let totalActiveDays = 0;
  let totalCount = 0;
  let totalDuration = 0;
  for (let m = 0; m < 12; m++) {
    const total = daysInMonth(year, m);
    for (let d = 1; d <= total; d++) {
      const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const { count = 0, duration = 0 } = dayMap.get(date) ?? {};
      const level = intensityLevel(count, duration);
      days.push({ date, count, duration, level });
      if (count > 0 || duration > 0) totalActiveDays += 1;
      totalCount += count;
      totalDuration += duration;
    }
  }

  return { year, days, totalActiveDays, totalCount, totalDuration };
}

/**
 * 学习日历：按月返回每日明细（含 session 列表），供点击查看详情。
 */
export async function getCalendarData(userId: string, month: string): Promise<CalendarData> {
  const db = getDb();

  if (!isValidMonth(month)) {
    return { month, days: [] };
  }

  const year = Number(month.slice(0, 4));
  const monthIdx = Number(month.slice(5, 7)) - 1;
  const start = `${month}-01`;
  const end = `${month}-${String(daysInMonth(year, monthIdx)).padStart(2, "0")}`;

  type SessionDetailRow = {
    id: string;
    date: string;
    duration: number;
    chapter_id: string | null;
  };
  const sessionRows = db
    .query<SessionDetailRow, [string, string, string]>(
      `SELECT id, date, duration, chapter_id
       FROM study_sessions
       WHERE user_id = ? AND date BETWEEN ? AND ?
       ORDER BY date ASC;`,
    )
    .all(userId, start, end);

  type QuizCountRow = { date: string; count: number };
  const quizRows = db
    .query<QuizCountRow, [string, string, string]>(
      `SELECT substr(created_at, 1, 10) AS date, COUNT(*) AS count
       FROM quiz_records
       WHERE user_id = ? AND substr(created_at, 1, 10) BETWEEN ? AND ?
       GROUP BY date;`,
    )
    .all(userId, start, end);

  type ReviewCountRow = { date: string; count: number };
  const reviewRows = db
    .query<ReviewCountRow, [string, string, string]>(
      `SELECT due_date AS date, COUNT(*) AS count
       FROM review_cards
       WHERE user_id = ? AND reps > 0 AND due_date BETWEEN ? AND ?
       GROUP BY due_date;`,
    )
    .all(userId, start, end);

  const dayMap = new Map<string, CalendarDay>();
  const ensure = (date: string): CalendarDay => {
    const existing = dayMap.get(date);
    if (existing) return existing;
    const created: CalendarDay = { date, count: 0, duration: 0, sessions: [] };
    dayMap.set(date, created);
    return created;
  };

  for (const r of sessionRows) {
    const day = ensure(r.date);
    day.duration += r.duration;
    day.sessions.push({
      sessionId: r.id,
      chapterId: r.chapter_id,
      duration: r.duration,
    });
  }
  for (const r of quizRows) {
    const day = ensure(r.date);
    day.count += r.count;
  }
  for (const r of reviewRows) {
    const day = ensure(r.date);
    day.count += r.count;
  }

  // 补全当月所有日期（无数据也保留以便 UI 渲染空格）
  const days: CalendarDay[] = [];
  const total = daysInMonth(year, monthIdx);
  for (let d = 1; d <= total; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    days.push(dayMap.get(date) ?? { date, count: 0, duration: 0, sessions: [] });
  }

  return { month, days };
}

/**
 * 章节掌握度：每个章节的完成度（已学/总知识点）+ 复习掌握度（卡片 reps/ease）。
 */
export async function getChapterProgress(userId: string): Promise<ChapterProgress[]> {
  const chapters = await loadChapters();
  const db = getDb();

  // 取用户所有 review_cards 聚合
  type CardAggRow = {
    knowledge_point_id: string;
    reps_sum: number;
    card_count: number;
    ease_avg: number;
  };
  const cardAgg = new Map<string, CardAggRow>();
  const cardRows = db
    .query<CardAggRow, [string]>(
      `SELECT knowledge_point_id,
              SUM(reps) AS reps_sum,
              COUNT(*) AS card_count,
              AVG(ease) AS ease_avg
       FROM review_cards
       WHERE user_id = ?
       GROUP BY knowledge_point_id;`,
    )
    .all(userId);
  for (const r of cardRows) cardAgg.set(r.knowledge_point_id, r);

  // 章节维度聚合（用知识点→章节映射）
  const kpToChapter = new Map<string, { chapterId: string; section: string; examWeight: number }>();
  for (const ch of chapters) {
    for (const kp of ch.knowledgePoints) {
      kpToChapter.set(kp.id, {
        chapterId: ch.id,
        section: ch.section,
        examWeight: ch.examWeight,
      });
    }
  }

  const chapterAgg = new Map<
    string,
    {
      totalKnowledgePoints: number;
      studiedKnowledgePoints: Set<string>;
      totalReviews: number;
      easeSum: number;
      easeCount: number;
      mastered: number;
    }
  >();

  for (const ch of chapters) {
    chapterAgg.set(ch.id, {
      totalKnowledgePoints: ch.knowledgePoints.length,
      studiedKnowledgePoints: new Set(),
      totalReviews: 0,
      easeSum: 0,
      easeCount: 0,
      mastered: 0,
    });
  }

  for (const [kpId, agg] of cardAgg) {
    const meta = kpToChapter.get(kpId);
    if (!meta) continue;
    const entry = chapterAgg.get(meta.chapterId);
    if (!entry) continue;
    entry.studiedKnowledgePoints.add(kpId);
    entry.totalReviews += agg.reps_sum ?? 0;
    entry.easeSum += (agg.ease_avg ?? 0) * (agg.card_count ?? 0);
    entry.easeCount += agg.card_count ?? 0;
    if ((agg.reps_sum ?? 0) >= 3 && (agg.ease_avg ?? 0) >= 2.5) {
      entry.mastered += 1;
    }
  }

  const result: ChapterProgress[] = [];
  for (const ch of chapters) {
    const agg = chapterAgg.get(ch.id);
    if (!agg) continue;
    const totalKp = agg.totalKnowledgePoints;
    const studied = agg.studiedKnowledgePoints.size;
    const completionRate = totalKp === 0 ? 0 : Math.round((studied / totalKp) * 1000) / 10;
    const averageEase =
      agg.easeCount === 0 ? 0 : Math.round((agg.easeSum / agg.easeCount) * 100) / 100;
    const masteryRate = totalKp === 0 ? 0 : Math.round((agg.mastered / totalKp) * 1000) / 10;
    result.push({
      chapterId: ch.id,
      chapterTitle: ch.title,
      section: ch.section,
      totalKnowledgePoints: totalKp,
      studiedKnowledgePoints: studied,
      completionRate,
      totalReviews: agg.totalReviews,
      averageEase,
      masteryRate,
      examWeight: ch.examWeight,
    });
  }

  // 按 order 排序输出
  result.sort((a, b) => {
    const ao = chapters.find((c) => c.id === a.chapterId)?.order ?? 0;
    const bo = chapters.find((c) => c.id === b.chapterId)?.order ?? 0;
    return ao - bo;
  });

  return result;
}
