import { getDb } from "../db";
import { loadQuestions, type QuizQuestion } from "./quiz";
import { recordAnswer } from "./quiz";

export interface CompExamPaper {
  examId: string;
  questions: Array<{
    id: string;
    question: string;
    options: Record<string, string>;
    chapter: string;
    difficulty: string;
    source: string;
    year: number | null;
  }>;
  duration: number; // minutes
  remainingTime: number; // seconds
}

export interface CompExamReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number; // seconds
  chapterDistribution: Array<{
    chapter: string;
    total: number;
    correct: number;
    rate: number;
  }>;
  wrongQuestions: Array<{
    id: string;
    question: string;
    options: Record<string, string>;
    chapter: string;
    correctAnswer: string;
    userAnswer: string;
    explanation: string;
  }>;
}

const QUESTION_COUNT = 75;
const PASS_LINE = 45;

function shuffle<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a comprehensive exam paper for a user.
 * Uses the exam record's answersSnapshot.questionIds if present,
 * otherwise draws fresh questions (excluding those answered in last 30 days).
 */
export async function generateExamPaper(
  userId: string,
  examId: string,
): Promise<CompExamPaper | null> {
  const db = getDb();
  const row = db
    .query<
      {
        answers_snapshot: string;
        remaining_time: number;
        duration: number;
      },
      [string, string]
    >(
      `SELECT answers_snapshot, remaining_time, duration
       FROM exam_records
       WHERE id = ? AND user_id = ? AND exam_type = 'comprehensive';`,
    )
    .get(examId, userId);

  if (!row) return null;

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    questionIds?: string[];
    answers?: Record<string, string>;
  };

  let questionIds: string[] = snapshot.questionIds ?? [];

  if (questionIds.length === 0) {
    const all = await loadQuestions();

    // Exclude questions answered in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentRows = db
      .query<{ question_id: string }, [string, string]>(
        `SELECT DISTINCT question_id FROM quiz_records
         WHERE user_id = ? AND created_at > ?;`,
      )
      .all(userId, thirtyDaysAgo);
    const recentIds = new Set(recentRows.map((r) => r.question_id));

    const pool = all.filter((q) => !recentIds.has(q.id));
    const shuffled = shuffle(pool);
    questionIds = shuffled.slice(0, QUESTION_COUNT).map((q) => q.id);

    // Save questionIds back to snapshot
    const newSnapshot = {
      ...snapshot,
      questionIds,
    };
    db.prepare(`UPDATE exam_records SET answers_snapshot = ? WHERE id = ? AND user_id = ?;`).run(
      JSON.stringify(newSnapshot),
      examId,
      userId,
    );
  }

  const allQuestions = await loadQuestions();
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));
  const questions = questionIds
    .map((id) => questionMap.get(id))
    .filter((q): q is QuizQuestion => q !== undefined)
    .map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      chapter: q.chapter,
      difficulty: q.difficulty,
      source: q.source,
      year: q.year,
    }));

  return {
    examId,
    questions,
    duration: row.duration,
    remainingTime: row.remaining_time,
  };
}

/**
 * Record a single answer during the exam.
 */
export async function submitAnswer(
  userId: string,
  examId: string,
  questionId: string,
  answer: string,
): Promise<{ success: boolean }> {
  const db = getDb();
  const row = db
    .query<{ answers_snapshot: string }, [string, string]>(
      `SELECT answers_snapshot FROM exam_records
       WHERE id = ? AND user_id = ? AND status = 'in_progress';`,
    )
    .get(examId, userId);

  if (!row) return { success: false };

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    questionIds?: string[];
    answers?: Record<string, string>;
  };
  const answers = snapshot.answers ?? {};
  answers[questionId] = answer;

  const newSnapshot = {
    ...snapshot,
    answers,
  };

  db.prepare(`UPDATE exam_records SET answers_snapshot = ? WHERE id = ? AND user_id = ?;`).run(
    JSON.stringify(newSnapshot),
    examId,
    userId,
  );

  return { success: true };
}

/**
 * Grade the exam and produce a report.
 * Also records each answer to quiz_records (for error book) and
 * marks wrong answers.
 */
export async function gradeExam(userId: string, examId: string): Promise<CompExamReport | null> {
  const db = getDb();
  const examRow = db
    .query<
      {
        answers_snapshot: string;
        started_at: string;
        finished_at: string | null;
      },
      [string, string]
    >(
      `SELECT answers_snapshot, started_at, finished_at
       FROM exam_records
       WHERE id = ? AND user_id = ? AND exam_type = 'comprehensive';`,
    )
    .get(examId, userId);

  if (!examRow) return null;

  const snapshot = JSON.parse(examRow.answers_snapshot || "{}") as {
    questionIds?: string[];
    answers?: Record<string, string>;
  };
  const questionIds = snapshot.questionIds ?? [];
  const userAnswers = snapshot.answers ?? {};

  const allQuestions = await loadQuestions();
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  let correctCount = 0;
  const chapterStats = new Map<string, { total: number; correct: number }>();
  const wrongQuestions: CompExamReport["wrongQuestions"] = [];

  for (const qid of questionIds) {
    const q = questionMap.get(qid);
    if (!q) continue;

    const userAnswer = userAnswers[qid] ?? "";
    const isCorrect = userAnswer.trim().toUpperCase() === q.answer.trim().toUpperCase();

    if (isCorrect) correctCount++;

    const chapter = q.chapter || "未知";
    const stat = chapterStats.get(chapter) ?? { total: 0, correct: 0 };
    stat.total++;
    if (isCorrect) stat.correct++;
    chapterStats.set(chapter, stat);

    // Record to quiz_records for error book tracking
    await recordAnswer(userId, qid, userAnswer);

    if (!isCorrect) {
      wrongQuestions.push({
        id: q.id,
        question: q.question,
        options: q.options,
        chapter,
        correctAnswer: q.answer,
        userAnswer,
        explanation: q.explanation,
      });
    }
  }

  const score = correctCount;
  const startedAt = new Date(examRow.started_at).getTime();
  const finishedAt = examRow.finished_at ? new Date(examRow.finished_at).getTime() : Date.now();
  const durationSec = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

  const chapterDistribution = Array.from(chapterStats.entries()).map(([chapter, stat]) => ({
    chapter,
    total: stat.total,
    correct: stat.correct,
    rate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
  }));

  // Sort by chapter
  chapterDistribution.sort((a, b) =>
    a.chapter.localeCompare(b.chapter, undefined, { numeric: true }),
  );

  // Finalize exam record
  const finishedAtIso = new Date().toISOString();
  db.prepare(
    `UPDATE exam_records
     SET status = 'finished', finished_at = ?, score = ?, detail_json = ?
     WHERE id = ? AND user_id = ?;`,
  ).run(
    finishedAtIso,
    score,
    JSON.stringify({
      questionIds,
      section: "comprehensive",
      score,
      passLine: PASS_LINE,
      passed: score >= PASS_LINE,
      duration: durationSec,
      chapterDistribution,
      wrongCount: wrongQuestions.length,
    }),
    examId,
    userId,
  );

  return {
    examId,
    score,
    total: QUESTION_COUNT,
    passLine: PASS_LINE,
    passed: score >= PASS_LINE,
    duration: durationSec,
    chapterDistribution,
    wrongQuestions,
  };
}

/**
 * Get exam report (can be called after grading).
 */
export async function getExamReport(
  userId: string,
  examId: string,
): Promise<CompExamReport | null> {
  const db = getDb();
  const examRow = db
    .query<
      {
        score: number | null;
        answers_snapshot: string;
        started_at: string;
        finished_at: string | null;
      },
      [string, string]
    >(
      `SELECT score, answers_snapshot, started_at, finished_at
       FROM exam_records
       WHERE id = ? AND user_id = ? AND exam_type = 'comprehensive';`,
    )
    .get(examId, userId);

  if (!examRow) return null;

  // If already graded and score present, reconstruct report from snapshot
  const snapshot = JSON.parse(examRow.answers_snapshot || "{}") as {
    questionIds?: string[];
    answers?: Record<string, string>;
  };
  const questionIds = snapshot.questionIds ?? [];
  const userAnswers = snapshot.answers ?? {};

  const allQuestions = await loadQuestions();
  const questionMap = new Map(allQuestions.map((q) => [q.id, q]));

  let correctCount = 0;
  const chapterStats = new Map<string, { total: number; correct: number }>();
  const wrongQuestions: CompExamReport["wrongQuestions"] = [];

  for (const qid of questionIds) {
    const q = questionMap.get(qid);
    if (!q) continue;

    const userAnswer = userAnswers[qid] ?? "";
    const isCorrect = userAnswer.trim().toUpperCase() === q.answer.trim().toUpperCase();

    if (isCorrect) correctCount++;

    const chapter = q.chapter || "未知";
    const stat = chapterStats.get(chapter) ?? { total: 0, correct: 0 };
    stat.total++;
    if (isCorrect) stat.correct++;
    chapterStats.set(chapter, stat);

    if (!isCorrect) {
      wrongQuestions.push({
        id: q.id,
        question: q.question,
        options: q.options,
        chapter,
        correctAnswer: q.answer,
        userAnswer,
        explanation: q.explanation,
      });
    }
  }

  const score = examRow.score ?? correctCount;
  const startedAt = new Date(examRow.started_at).getTime();
  const finishedAt = examRow.finished_at ? new Date(examRow.finished_at).getTime() : Date.now();
  const durationSec = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

  const chapterDistribution = Array.from(chapterStats.entries()).map(([chapter, stat]) => ({
    chapter,
    total: stat.total,
    correct: stat.correct,
    rate: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
  }));
  chapterDistribution.sort((a, b) =>
    a.chapter.localeCompare(b.chapter, undefined, { numeric: true }),
  );

  return {
    examId,
    score,
    total: QUESTION_COUNT,
    passLine: PASS_LINE,
    passed: score >= PASS_LINE,
    duration: durationSec,
    chapterDistribution,
    wrongQuestions,
  };
}
