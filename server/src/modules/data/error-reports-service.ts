import { getDb } from "../../db";

export type ErrorReportStatus = "pending" | "resolved" | "rejected";

export interface ErrorReport {
  id: string;
  userId: string;
  questionId: string;
  description: string;
  type: string;
  status: ErrorReportStatus;
  createdAt: string;
}

export interface CreateErrorReportInput {
  userId: string;
  questionId: string;
  type: string;
  description: string;
}

export function createErrorReport(input: CreateErrorReportInput): ErrorReport {
  const db = getDb();
  const id = Bun.randomUUIDv7();
  const createdAt = new Date().toISOString();
  const status: ErrorReportStatus = "pending";

  db.run(
    `INSERT INTO error_reports (id, user_id, question_id, description, type, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.userId, input.questionId, input.description, input.type, status, createdAt],
  );

  return {
    id,
    userId: input.userId,
    questionId: input.questionId,
    description: input.description,
    type: input.type,
    status,
    createdAt,
  };
}

function isValidStatus(value: unknown): value is ErrorReportStatus {
  return value === "pending" || value === "resolved" || value === "rejected";
}

export function listErrorReports(): ErrorReport[] {
  const db = getDb();
  type Row = {
    id: string;
    user_id: string;
    question_id: string;
    description: string;
    type: string;
    status: string;
    created_at: string;
  };
  const rows = db
    .query<Row, []>(
      `SELECT id, user_id, question_id, description, type, status, created_at
     FROM error_reports
     ORDER BY created_at DESC`,
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    questionId: row.question_id,
    description: row.description,
    type: row.type,
    status: isValidStatus(row.status) ? row.status : "pending",
    createdAt: row.created_at,
  }));
}
