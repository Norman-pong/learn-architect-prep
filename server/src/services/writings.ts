import {
  THESIS_SECTIONS,
  type ThesisSectionKey,
  type ThesisSections,
  type Writing,
  type WritingSummary,
  type WritingUpsertBody,
} from "@archprep/shared";
import { getDb } from "../db";

interface WritingRow {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  ai_score_json: string | null;
  created_at: string;
}

const EMPTY_SECTIONS: ThesisSections = {
  summary: "",
  background: "",
  solution: "",
  reflection: "",
  conclusion: "",
};

/**
 * Parse the JSON-encoded `content` column back into a `ThesisSections`.
 * Falls back to empty strings for any missing / malformed fields so
 * the editor never crashes on legacy rows.
 */
function parseContent(raw: string | null): ThesisSections {
  const out: ThesisSections = { ...EMPTY_SECTIONS };
  if (!raw) return out;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const key of THESIS_SECTIONS) {
        const candidate = (parsed as Record<string, unknown>)[key];
        if (typeof candidate === "string") {
          out[key] = candidate;
        }
      }
    }
  } catch {
    /* malformed content — keep all sections empty */
  }
  return out;
}

function sumWords(sections: ThesisSections): number {
  let total = 0;
  for (const value of Object.values(sections)) {
    // Han chars count as 1 word each; ASCII tokens count per token.
    total += (value.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) ?? []).length;
    total += (value.match(/[A-Za-z0-9]+/g) ?? []).length;
  }
  return total;
}

function toPublic(row: WritingRow): Writing {
  const content = parseContent(row.content);
  let aiScore: Writing["aiScore"] = null;
  if (row.ai_score_json) {
    try {
      const parsed: unknown = JSON.parse(row.ai_score_json);
      if (parsed && typeof parsed === "object") {
        aiScore = parsed as Writing["aiScore"];
      }
    } catch {
      aiScore = null;
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content,
    aiScore,
    createdAt: row.created_at,
    // PRD §6.1 does not include updated_at on writings; surface the same
    // timestamp so the editor can order the list without a schema change.
    updatedAt: row.created_at,
  };
}

function normalizeSections(input: ThesisSections): ThesisSections {
  const out: ThesisSections = { ...EMPTY_SECTIONS };
  for (const key of THESIS_SECTIONS) {
    const candidate = input[key];
    out[key] = typeof candidate === "string" ? candidate : "";
  }
  return out;
}

export function listWritings(userId: string): WritingSummary[] {
  const db = getDb();
  const rows = db
    .query<WritingRow, [string]>(
      "SELECT id, user_id, title, content, ai_score_json, created_at FROM writings WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(userId);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    wordCount: sumWords(parseContent(row.content)),
    updatedAt: row.created_at,
  }));
}

export function getWriting(userId: string, id: string): Writing | null {
  const db = getDb();
  const row = db
    .query<WritingRow, [string, string]>(
      "SELECT id, user_id, title, content, ai_score_json, created_at FROM writings WHERE id = ? AND user_id = ? LIMIT 1",
    )
    .get(id, userId);
  return row ? toPublic(row) : null;
}

/**
 * Upsert by `id`. When `id` is missing, a new row is created. The unique
 * identity is `(id, user_id)` — `id` is a UUID generated server-side so
 * concurrent users can never collide.
 */
export function upsertWriting(userId: string, body: WritingUpsertBody): Writing {
  const db = getDb();
  const sections = normalizeSections(body.sections);
  const contentJson = JSON.stringify(sections);
  const title = body.title.trim() || "未命名论文";

  if (body.id) {
    // Update path: verify ownership first to prevent cross-user writes.
    const owned = db
      .query<{ id: string }, [string, string]>(
        "SELECT id FROM writings WHERE id = ? AND user_id = ? LIMIT 1",
      )
      .get(body.id, userId);
    if (!owned) {
      throw new Error("论文不存在或无权访问");
    }
    const row = db
      .query<WritingRow, [string, string, string, string]>(
        `UPDATE writings
         SET title = ?, content = ?
         WHERE id = ? AND user_id = ?
         RETURNING id, user_id, title, content, ai_score_json, created_at`,
      )
      .get(title, contentJson, body.id, userId);
    if (!row) {
      throw new Error("更新失败");
    }
    return toPublic(row);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const row = db
    .query<WritingRow, [string, string, string, string, null, string]>(
      `INSERT INTO writings (id, user_id, title, content, ai_score_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, user_id, title, content, ai_score_json, created_at`,
    )
    .get(id, userId, title, contentJson, null, createdAt);
  if (!row) {
    throw new Error("创建失败");
  }
  return toPublic(row);
}

export function deleteWriting(userId: string, id: string): boolean {
  const db = getDb();
  const result = db
    .query<{ id: string }, [string, string]>(
      "DELETE FROM writings WHERE id = ? AND user_id = ? RETURNING id",
    )
    .get(id, userId);
  return Boolean(result);
}

export type { ThesisSectionKey };
