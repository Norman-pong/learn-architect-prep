import { getDb } from "../../db";
import type { SQLQueryBindings } from "bun:sqlite";

export interface UserDataBackup {
  version: number;
  exportedAt: string;
  userId: string;
  reviewCards: Record<string, unknown>[];
  quizRecords: Record<string, unknown>[];
  examRecords: Record<string, unknown>[];
  writings: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  studySessions: Record<string, unknown>[];
  aiConfigs: Record<string, unknown>[];
  aiUsage: Record<string, unknown>[];
}

const BACKUP_TABLES: { table: string; columns: string[] }[] = [
  {
    table: "review_cards",
    columns: [
      "card_id",
      "user_id",
      "knowledge_point_id",
      "ease",
      "interval",
      "due_date",
      "reps",
      "lapses",
    ],
  },
  {
    table: "quiz_records",
    columns: ["id", "user_id", "question_id", "selected_answer", "is_correct", "created_at"],
  },
  {
    table: "exam_records",
    columns: [
      "id",
      "user_id",
      "exam_type",
      "mode",
      "status",
      "score",
      "duration",
      "remaining_time",
      "answers_snapshot",
      "started_at",
      "finished_at",
      "detail_json",
    ],
  },
  {
    table: "writings",
    columns: ["id", "user_id", "title", "content", "ai_score_json", "created_at"],
  },
  {
    table: "notes",
    columns: ["id", "user_id", "knowledge_point_id", "content", "type"],
  },
  {
    table: "study_sessions",
    columns: ["id", "user_id", "date", "duration", "chapter_id"],
  },
  {
    table: "ai_configs",
    columns: ["id", "user_id", "provider", "api_key_encrypted", "model", "base_url", "updated_at"],
  },
  {
    table: "ai_usage",
    columns: [
      "id",
      "user_id",
      "feature",
      "provider",
      "model",
      "input_tokens",
      "output_tokens",
      "cost_estimate",
      "created_at",
    ],
  },
];

function rowToObject(row: Record<string, unknown>, columns: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const col of columns) {
    obj[col] = row[col];
  }
  return obj;
}

export function exportData(userId: string): UserDataBackup {
  const db = getDb();
  const result: UserDataBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    reviewCards: [],
    quizRecords: [],
    examRecords: [],
    writings: [],
    notes: [],
    studySessions: [],
    aiConfigs: [],
    aiUsage: [],
  };

  for (const { table, columns } of BACKUP_TABLES) {
    const rows = db
      .query(`SELECT ${columns.join(", ")} FROM ${table} WHERE user_id = ?`)
      .all(userId) as Record<string, unknown>[];
    const key = tableToKey(table);
    (result as unknown as Record<string, Record<string, unknown>[]>)[key] = rows.map((row) =>
      rowToObject(row, columns),
    );
  }

  return result;
}

function tableToKey(table: string): keyof UserDataBackup {
  switch (table) {
    case "review_cards":
      return "reviewCards";
    case "quiz_records":
      return "quizRecords";
    case "exam_records":
      return "examRecords";
    case "writings":
      return "writings";
    case "notes":
      return "notes";
    case "study_sessions":
      return "studySessions";
    case "ai_configs":
      return "aiConfigs";
    case "ai_usage":
      return "aiUsage";
    default:
      throw new Error(`Unknown backup table: ${table}`);
  }
}

function validateBackup(data: unknown): data is UserDataBackup {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d.userId !== "string") return false;
  if (typeof d.exportedAt !== "string") return false;
  return true;
}

export function importData(
  userId: string,
  jsonData: unknown,
): { imported: number; errors: string[] } {
  const db = getDb();
  const errors: string[] = [];
  let imported = 0;

  if (!validateBackup(jsonData)) {
    throw new Error("Invalid backup format: missing userId or exportedAt");
  }

  db.transaction(() => {
    for (const { table, columns } of BACKUP_TABLES) {
      const key = tableToKey(table);
      const rows = (jsonData as unknown as Record<string, unknown>)[key];
      if (!Array.isArray(rows)) {
        errors.push(`Skipping ${table}: expected array`);
        continue;
      }

      const insertColumns = columns.filter((c) => c !== "user_id");
      const placeholders = insertColumns.map(() => "?").join(", ");
      const columnList = insertColumns.join(", ");
      const upsert = db.prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})
         ON CONFLICT(id) DO UPDATE SET ${insertColumns.map((c) => `${c} = excluded.${c}`).join(", ")}`,
      );
      // review_cards uses card_id as primary key, need a separate upsert
      const upsertReviewCard = db.prepare(
        `INSERT INTO review_cards (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})
         ON CONFLICT(card_id) DO UPDATE SET ${insertColumns.map((c) => `${c} = excluded.${c}`).join(", ")}`,
      );

      for (const row of rows) {
        if (typeof row !== "object" || row === null) {
          errors.push(`Skipping malformed row in ${table}`);
          continue;
        }
        const values: SQLQueryBindings[] = [];
        for (const col of columns) {
          if (col === "user_id") {
            values.push(userId);
          } else {
            const value = (row as Record<string, unknown>)[col];
            if (value === undefined) {
              values.push(null);
            } else {
              values.push(value as SQLQueryBindings);
            }
          }
        }
        try {
          if (table === "review_cards") {
            upsertReviewCard.run(...values);
          } else {
            upsert.run(...values);
          }
          imported++;
        } catch (e) {
          errors.push(
            `Failed to import row in ${table}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    }
  })();

  return { imported, errors };
}
