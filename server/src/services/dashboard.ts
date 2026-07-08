import type { Database } from "bun:sqlite";

export interface DashboardSummary {
  todayReviewCount: number;
  streakDays: number;
  weakPointCount: number;
  lastMockScore: number | null;
}

export function getDashboard(userId: string, db: Database): DashboardSummary {
  const todayReviewCount = getTodayReviewCount(userId, db);
  const streakDays = getStreak(userId, db);
  const weakPointCount = getWeakPointCount(userId, db);
  const lastMockScore = getLastMockScore(userId, db);

  return {
    todayReviewCount,
    streakDays,
    weakPointCount,
    lastMockScore,
  };
}

function getTodayReviewCount(userId: string, db: Database): number {
  const row = db
    .query(
      `SELECT COUNT(*) AS count
       FROM review_cards
       WHERE user_id = ? AND due_date <= CURRENT_DATE`,
    )
    .get(userId) as { count: number } | null;
  return row?.count ?? 0;
}

function getStreak(userId: string, db: Database): number {
  const rows = db
    .query(
      `SELECT date
       FROM study_sessions
       WHERE user_id = ?
       ORDER BY date DESC`,
    )
    .all(userId) as { date: string }[];

  if (rows.length === 0) {
    return 0;
  }

  const today = formatLocalDate(new Date());
  const yesterday = formatLocalDate(addDays(new Date(), -1));

  let expected = rows[0].date === today ? today : yesterday;
  let streak = 0;

  for (const { date } of rows) {
    if (date === expected) {
      streak += 1;
      expected = formatLocalDate(addDays(parseDate(expected), -1));
    } else if (date > expected) {
      // Duplicate/future date in descending order; skip until we find the expected date.
      continue;
    } else {
      break;
    }
  }

  return streak;
}

function getWeakPointCount(userId: string, db: Database): number {
  const row = db
    .query(
      `SELECT COUNT(*) AS count
       FROM (
         SELECT question_id
         FROM quiz_records
         WHERE user_id = ?
         GROUP BY question_id
         HAVING SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) / CAST(COUNT(*) AS REAL) < 0.6
       )`,
    )
    .get(userId) as { count: number } | null;
  return row?.count ?? 0;
}

function getLastMockScore(userId: string, db: Database): number | null {
  const row = db
    .query(
      `SELECT score
       FROM exam_records
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId) as { score: number } | null;
  return row?.score ?? null;
}

function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
