import { getDb } from "../db";
import { randomUUID } from "node:crypto";
import { loadQuestions } from "./quiz";

export type ExamType = "comprehensive" | "case" | "essay" | "full";
export type ExamMode = "single" | "full";
export type ExamStatus = "in_progress" | "finished";

export interface ExamConfig {
  examType: Exclude<ExamType, "full">;
  questionCount: number;
  duration: number; // minutes
  chooseCount?: number; // 5选4 / 4选1
}

export interface ExamRecord {
  id: string;
  userId: string;
  examType: ExamType;
  mode: ExamMode;
  status: ExamStatus;
  score: number | null;
  duration: number;
  remainingTime: number;
  answersSnapshot: Record<string, unknown>;
  startedAt: string;
  finishedAt: string | null;
  detailJson: Record<string, unknown> | null;
}

const EXAM_CONFIGS: Record<Exclude<ExamType, "full">, ExamConfig> = {
  comprehensive: {
    examType: "comprehensive",
    questionCount: 75,
    duration: 150,
  },
  case: {
    examType: "case",
    questionCount: 5,
    chooseCount: 4,
    duration: 90,
  },
  essay: {
    examType: "essay",
    questionCount: 4,
    chooseCount: 1,
    duration: 120,
  },
};

export function getExamConfig(examType: ExamType): ExamConfig | null {
  if (examType === "full") {
    // full mode represents comprehensive + case (240 min) or essay (120 min) separately
    return null;
  }
  return EXAM_CONFIGS[examType];
}

export function getConfigs(): ExamConfig[] {
  return Object.values(EXAM_CONFIGS);
}

export function getFullModuleDuration(examType: ExamType): number {
  if (examType === "full") return EXAM_CONFIGS.comprehensive.duration + EXAM_CONFIGS.case.duration; // 240
  return EXAM_CONFIGS[examType]?.duration ?? 0;
}

function getDurationFor(examType: ExamType): number {
  if (examType === "full") {
    return EXAM_CONFIGS.comprehensive.duration + EXAM_CONFIGS.case.duration;
  }
  return EXAM_CONFIGS[examType].duration;
}

async function drawQuestions(
  examType: Exclude<ExamType, "full">,
  userId: string,
): Promise<string[]> {
  const all = await loadQuestions();
  const chapterPrefix =
    examType === "comprehensive" ? undefined : examType === "case" ? "case" : "essay";

  const pool = chapterPrefix
    ? all.filter((q) => q.chapter?.toLowerCase().startsWith(chapterPrefix))
    : all.filter((q) => {
        const chapter = q.chapter ?? "";
        return (
          !chapter.toLowerCase().startsWith("case") && !chapter.toLowerCase().startsWith("essay")
        );
      });

  const shuffled = pool
    .map((q) => ({ q, sort: Math.random() }))
    .toSorted((a, b) => a.sort - b.sort)
    .map(({ q }) => q.id);

  const config = EXAM_CONFIGS[examType];
  return shuffled.slice(0, config.questionCount);
}

export async function startExam(
  userId: string,
  examType: ExamType,
  mode: ExamMode,
): Promise<ExamRecord> {
  const db = getDb();
  const id = randomUUID();
  const duration = getDurationFor(examType);
  const remainingTime = duration * 60; // seconds
  const startedAt = new Date().toISOString();
  const questionIds = examType === "full" ? [] : await drawQuestions(examType, userId);

  const snapshot = {
    questionIds,
    answers: {} as Record<string, unknown>,
  };

  db.prepare(
    `INSERT INTO exam_records (
      id, user_id, exam_type, mode, status, score, duration, remaining_time, answers_snapshot, started_at, finished_at, detail_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  ).run(
    id,
    userId,
    examType,
    mode,
    "in_progress",
    null,
    duration,
    remainingTime,
    JSON.stringify(snapshot),
    startedAt,
    null,
    JSON.stringify({
      questionIds,
      section: examType === "full" ? "comprehensive" : examType,
    }),
  );

  return {
    id,
    userId,
    examType,
    mode,
    status: "in_progress",
    score: null,
    duration,
    remainingTime,
    answersSnapshot: snapshot,
    startedAt,
    finishedAt: null,
    detailJson: { questionIds, section: examType === "full" ? "comprehensive" : examType },
  };
}

export async function getExamById(userId: string, examId: string): Promise<ExamRecord | null> {
  const db = getDb();
  const row = db
    .query<
      {
        id: string;
        user_id: string;
        exam_type: string;
        mode: string;
        status: string;
        score: number | null;
        duration: number;
        remaining_time: number;
        answers_snapshot: string;
        started_at: string;
        finished_at: string | null;
        detail_json: string | null;
      },
      [string, string]
    >("SELECT * FROM exam_records WHERE id = ? AND user_id = ?;")
    .get(examId, userId);
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    examType: row.exam_type as ExamType,
    mode: row.mode as ExamMode,
    status: row.status as ExamStatus,
    score: row.score,
    duration: row.duration,
    remainingTime: row.remaining_time,
    answersSnapshot: JSON.parse(row.answers_snapshot || "{}"),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    detailJson: row.detail_json ? JSON.parse(row.detail_json) : null,
  };
}

export async function getActiveExam(userId: string): Promise<ExamRecord | null> {
  const db = getDb();
  const row = db
    .query<
      {
        id: string;
        user_id: string;
        exam_type: string;
        mode: string;
        status: string;
        score: number | null;
        duration: number;
        remaining_time: number;
        answers_snapshot: string;
        started_at: string;
        finished_at: string | null;
        detail_json: string | null;
      },
      [string]
    >(
      "SELECT * FROM exam_records WHERE user_id = ? AND status = 'in_progress' ORDER BY started_at DESC LIMIT 1;",
    )
    .get(userId);
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    examType: row.exam_type as ExamType,
    mode: row.mode as ExamMode,
    status: row.status as ExamStatus,
    score: row.score,
    duration: row.duration,
    remainingTime: row.remaining_time,
    answersSnapshot: JSON.parse(row.answers_snapshot || "{}"),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    detailJson: row.detail_json ? JSON.parse(row.detail_json) : null,
  };
}

export async function pauseExam(
  userId: string,
  examId: string,
  remainingTime: number,
  answersSnapshot: Record<string, unknown>,
): Promise<ExamRecord | null> {
  const db = getDb();
  const exists = db
    .query<{ count: number }, [string, string]>(
      "SELECT COUNT(*) as count FROM exam_records WHERE id = ? AND user_id = ? AND status = 'in_progress';",
    )
    .get(examId, userId);
  if (!exists || exists.count === 0) return null;

  db.prepare(
    "UPDATE exam_records SET remaining_time = ?, answers_snapshot = ? WHERE id = ? AND user_id = ?;",
  ).run(remainingTime, JSON.stringify(answersSnapshot), examId, userId);

  return getExamById(userId, examId);
}

export async function resumeExam(userId: string, examId: string): Promise<ExamRecord | null> {
  const exam = await getExamById(userId, examId);
  if (!exam || exam.status !== "in_progress") return null;
  return exam;
}

export async function finishExam(
  userId: string,
  examId: string,
  answersSnapshot?: Record<string, unknown>,
  score?: number,
): Promise<ExamRecord | null> {
  const db = getDb();
  const exam = await getExamById(userId, examId);
  if (!exam || exam.status !== "in_progress") return null;

  const finishedAt = new Date().toISOString();
  const finalScore = score ?? null;

  db.prepare(
    "UPDATE exam_records SET status = 'finished', finished_at = ?, score = ?, answers_snapshot = ? WHERE id = ? AND user_id = ?;",
  ).run(
    finishedAt,
    finalScore,
    JSON.stringify(answersSnapshot ?? exam.answersSnapshot),
    examId,
    userId,
  );

  return getExamById(userId, examId);
}
