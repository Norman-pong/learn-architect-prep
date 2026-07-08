import { createHash } from "node:crypto";
import { getDb } from "../db";
import { getQuestionById, loadQuestions, toPublicQuestion, type PublicQuestion } from "./quiz";

export interface ErrorBookItem extends PublicQuestion {
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
  errorAt: string;
  mastered: boolean;
  masteredAt?: string;
}

export interface ErrorBookFilter {
  chapter?: string;
  mastered?: boolean;
}

interface LatestRecordRow {
  question_id: string;
  selected_answer: string;
  is_correct: number;
  created_at: string;
}

interface MasteredRow {
  question_id: string;
  mastered_at: string;
}

export async function getErrorBook(
  userId: string,
  filter: ErrorBookFilter = {},
): Promise<ErrorBookItem[]> {
  const all = await loadQuestions();
  const questionMap = new Map(all.map((q) => [q.id, q]));

  const db = getDb();

  // Latest record per question for this user.
  const rows = db
    .query<LatestRecordRow, [string]>(
      `SELECT question_id, selected_answer, is_correct, created_at
       FROM quiz_records
       WHERE user_id = ?
       ORDER BY created_at DESC;`,
    )
    .all(userId);

  const latestByQuestion = new Map<string, LatestRecordRow>();
  for (const row of rows) {
    if (!latestByQuestion.has(row.question_id)) {
      latestByQuestion.set(row.question_id, row);
    }
  }

  // Mastered records for this user.
  const masteredRows = db
    .query<MasteredRow, [string]>(
      `SELECT question_id, mastered_at
       FROM error_book_mastered
       WHERE user_id = ?;`,
    )
    .all(userId);

  const masteredMap = new Map(masteredRows.map((r) => [r.question_id, r.mastered_at]));

  const items: ErrorBookItem[] = [];
  for (const [questionId, record] of latestByQuestion) {
    if (record.is_correct !== 0) continue;

    const question = questionMap.get(questionId);
    if (!question) continue;

    if (filter.chapter && question.chapter !== filter.chapter) continue;

    const mastered = masteredMap.has(questionId);
    if (filter.mastered === false && mastered) continue;
    if (filter.mastered === true && !mastered) continue;

    items.push({
      ...toPublicQuestion(question),
      selectedAnswer: record.selected_answer,
      correctAnswer: question.answer,
      explanation: question.explanation,
      errorAt: record.created_at,
      mastered,
      masteredAt: masteredMap.get(questionId),
    });
  }

  // Sort by most recent error first.
  items.sort((a, b) => new Date(b.errorAt).getTime() - new Date(a.errorAt).getTime());
  return items;
}

export async function markMastered(userId: string, questionId: string): Promise<boolean> {
  const question = await getQuestionById(questionId);
  if (!question) return false;

  const db = getDb();
  const id = createHash("sha256")
    .update(`${userId}:${questionId}`)
    .digest("hex");

  const existing = db
    .query<{ count: number }, [string]>("SELECT COUNT(*) as count FROM error_book_mastered WHERE id = ?;")
    .get(id);

  if (existing && existing.count > 0) return true;

  db.run(
    `INSERT INTO error_book_mastered (id, user_id, question_id, mastered_at)
     VALUES (?, ?, ?, ?);`,
    [id, userId, questionId, new Date().toISOString()],
  );
  return true;
}
