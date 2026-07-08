import { getDb } from "../db";

export const EXAM_TYPES = ["comprehensive", "case", "essay"] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  comprehensive: "综合知识",
  case: "案例分析",
  essay: "论文",
};

export const EXAM_MODE_LABELS: Record<string, string> = {
  single: "单模块",
  full: "全模块",
};

/** 软考高级(038) 各科合格线：三科满分 75，统一合格线 45 */
export const PASS_SCORE = 45;

export interface ExamHistoryRow {
  id: string;
  examType: ExamType;
  mode: string;
  status: string;
  score: number | null;
  duration: number;
  startedAt: string;
  finishedAt: string | null;
  passed: boolean | null; // null 表示未完成或暂无分数
}

/** 折线图数据点：X=日期(YYYY-MM-DD)，Y=分数，0 填充表示当天无成绩 */
export interface ScoreTrendPoint {
  date: string;
  score: number;
  passed: boolean;
}

/** 单科趋势 */
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

/** 完整趋势响应 */
export interface ScoreTrends {
  rangeStart: string;
  rangeEnd: string;
  total: ExamTypeTrend[];
}

interface ExamHistoryDbRow {
  id: string;
  exam_type: string;
  mode: string;
  status: string;
  score: number | null;
  duration: number;
  started_at: string;
  finished_at: string | null;
}

function parseExamType(value: string): ExamType | null {
  return (EXAM_TYPES as readonly string[]).includes(value) ? (value as ExamType) : null;
}

function toDateString(iso: string): string {
  return iso.slice(0, 10);
}

/** 把"用时"换算成"X分Y秒"展示用串 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes === 0) return `${secs}秒`;
  return `${minutes}分${secs}秒`;
}

/** 获取历次模考记录列表（按开始时间倒序，可选按 exam_type 过滤） */
export function getExamHistory(userId: string, examType?: string, limit = 200): ExamHistoryRow[] {
  const db = getDb();
  const filters: string[] = ["user_id = ?"];
  const params: (string | number)[] = [userId];
  if (examType && parseExamType(examType)) {
    filters.push("exam_type = ?");
    params.push(examType);
  }
  const where = `WHERE ${filters.join(" AND ")}`;
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));

  const rows = db
    .query<ExamHistoryDbRow, (string | number)[]>(
      `SELECT id, exam_type, mode, status, score, duration, started_at, finished_at
       FROM exam_records
       ${where}
       ORDER BY started_at DESC
       LIMIT ${safeLimit};`,
    )
    .all(...params);

  return rows.map((row) => {
    const type = parseExamType(row.exam_type);
    const passed = type && row.score != null ? row.score >= PASS_SCORE : null;
    return {
      id: row.id,
      examType: (type ?? row.exam_type) as ExamType,
      mode: row.mode,
      status: row.status,
      score: row.score,
      duration: row.duration,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
      passed,
    };
  });
}

/**
 * 获取分数趋势曲线数据（默认近 90 天）
 * - 按科目拆分三条折线
 * - 区间内已 finished 且有 score 的记录才入趋势
 * - 缺数据日期补 0 点（不绘制连接线，保持每天一个点）
 */
export function getScoreTrends(userId: string, days = 90, examType?: string): ScoreTrends {
  const db = getDb();
  const safeDays = Math.max(1, Math.min(365, Math.floor(days)));
  const start = new Date();
  start.setDate(start.getDate() - (safeDays - 1));
  const rangeStart = toDateString(start.toISOString());
  const rangeEnd = toDateString(new Date().toISOString());

  const filterExamType = examType && parseExamType(examType);
  const params: (string | number)[] = [
    userId,
    toDateString(start.toISOString()) + "T00:00:00.000Z",
  ];
  let examFilter = "";
  if (filterExamType) {
    examFilter = "AND exam_type = ?";
    params.push(filterExamType);
  }

  const rows = db
    .query<ExamHistoryDbRow, (string | number)[]>(
      `SELECT id, exam_type, mode, status, score, duration, started_at, finished_at
       FROM exam_records
       WHERE user_id = ?
         AND started_at >= ?
         AND status = 'finished'
         AND score IS NOT NULL
         ${examFilter}
       ORDER BY started_at ASC;`,
    )
    .all(...params);

  // 按科目分组
  const bucket = new Map<ExamType, Map<string, number>>();
  const metaByType = new Map<
    ExamType,
    {
      bestScore: number;
      latestScore: number;
      latestPassed: boolean;
      attemptCount: number;
      passedCount: number;
    }
  >();

  for (const row of rows) {
    const type = parseExamType(row.exam_type);
    if (!type || row.score == null) continue;
    const date = toDateString(row.started_at);
    const inner = bucket.get(type) ?? new Map<string, number>();
    inner.set(date, row.score);
    bucket.set(type, inner);

    const meta = metaByType.get(type) ?? {
      bestScore: 0,
      latestScore: 0,
      latestPassed: false,
      attemptCount: 0,
      passedCount: 0,
    };
    meta.bestScore = Math.max(meta.bestScore, row.score);
    meta.latestScore = row.score;
    meta.latestPassed = row.score >= PASS_SCORE;
    meta.attemptCount += 1;
    if (row.score >= PASS_SCORE) meta.passedCount += 1;
    metaByType.set(type, meta);
  }

  // 选定展示的科目列表
  const types: ExamType[] = filterExamType
    ? [filterExamType]
    : (EXAM_TYPES as readonly ExamType[]).slice();

  // 构造每天一个点的序列
  const today = new Date();
  const total: ExamTypeTrend[] = [];
  for (const type of types) {
    const pointsMap = bucket.get(type) ?? new Map<string, number>();
    const meta = metaByType.get(type) ?? null;
    const points: ScoreTrendPoint[] = [];
    for (let i = safeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const date = toDateString(d.toISOString());
      const score = pointsMap.get(date) ?? 0;
      const passed = score > 0 ? score >= PASS_SCORE : false;
      points.push({ date, score, passed });
    }
    total.push({
      examType: type,
      examTypeLabel: EXAM_TYPE_LABELS[type],
      points,
      bestScore: meta?.bestScore && meta.bestScore > 0 ? meta.bestScore : null,
      latestScore: meta && meta.attemptCount > 0 ? meta.latestScore : null,
      latestPassed: meta && meta.attemptCount > 0 ? meta.latestPassed : null,
      attemptCount: meta?.attemptCount ?? 0,
      passedCount: meta?.passedCount ?? 0,
    });
  }

  return { rangeStart, rangeEnd, total };
}
