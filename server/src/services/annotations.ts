import { getDb } from "../db";

export type AnnotationType = "highlight" | "note" | "question";

export interface Annotation {
  id: string;
  userId: string;
  knowledgePointId: string;
  content: string;
  type: AnnotationType;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string;
}

interface AnnotationRow {
  id: string;
  userId: string;
  knowledgePointId: string;
  content: string | null;
  type: string | null;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string | null;
}

const ANNOTATION_TYPES: Record<AnnotationType, true> = {
  highlight: true,
  note: true,
  question: true,
};

function isAnnotationType(type: string): type is AnnotationType {
  return Object.hasOwn(ANNOTATION_TYPES, type);
}

export class AnnotationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnnotationValidationError";
  }
}

function normalizeType(type: string): AnnotationType {
  if (isAnnotationType(type)) {
    return type;
  }
  throw new AnnotationValidationError("Unsupported annotation type");
}

function normalizeOffsets(
  startOffset?: number,
  endOffset?: number,
): { startOffset: number | null; endOffset: number | null } {
  const hasStart = startOffset !== undefined;
  const hasEnd = endOffset !== undefined;
  if (!hasStart && !hasEnd) {
    return { startOffset: null, endOffset: null };
  }
  if (!hasStart || !hasEnd) {
    throw new AnnotationValidationError("Both startOffset and endOffset are required");
  }
  if (!Number.isInteger(startOffset) || !Number.isInteger(endOffset)) {
    throw new AnnotationValidationError("Annotation offsets must be integers");
  }
  if (startOffset < 0 || endOffset <= startOffset) {
    throw new AnnotationValidationError("Annotation offsets are out of range");
  }
  return { startOffset, endOffset };
}

function toAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    userId: row.userId,
    knowledgePointId: row.knowledgePointId,
    content: row.content ?? "",
    type: normalizeType(row.type ?? "highlight"),
    startOffset: row.startOffset,
    endOffset: row.endOffset,
    createdAt: row.createdAt ?? "",
  };
}

export function addAnnotation(
  userId: string,
  kpId: string,
  type: string,
  content: string,
  startOffset?: number,
  endOffset?: number,
): Annotation {
  const annotationType = normalizeType(type);
  const normalizedContent = content.trim();
  if (!normalizedContent) {
    throw new AnnotationValidationError("Annotation content is required");
  }
  const offsets = normalizeOffsets(startOffset, endOffset);
  const id = Bun.randomUUIDv7();
  const createdAt = new Date().toISOString();
  const db = getDb();

  db.run(
    `INSERT INTO notes (id, user_id, knowledge_point_id, content, type, start_offset, end_offset, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      userId,
      kpId,
      normalizedContent,
      annotationType,
      offsets.startOffset,
      offsets.endOffset,
      createdAt,
    ],
  );

  return {
    id,
    userId,
    knowledgePointId: kpId,
    content: normalizedContent,
    type: annotationType,
    startOffset: offsets.startOffset,
    endOffset: offsets.endOffset,
    createdAt,
  };
}

export function getAnnotations(userId: string, kpId: string): Annotation[] {
  const db = getDb();
  const rows = db
    .query<AnnotationRow, [string, string]>(
      `SELECT id,
              user_id AS userId,
              knowledge_point_id AS knowledgePointId,
              content,
              type,
              start_offset AS startOffset,
              end_offset AS endOffset,
              created_at AS createdAt
       FROM notes
       WHERE user_id = ? AND knowledge_point_id = ?
       ORDER BY start_offset IS NULL, start_offset ASC, created_at ASC;`,
    )
    .all(userId, kpId);
  return rows.map(toAnnotation);
}

export function deleteAnnotation(userId: string, annotationId: string): boolean {
  const db = getDb();
  const result = db.run("DELETE FROM notes WHERE id = ? AND user_id = ?;", [annotationId, userId]);
  return result.changes > 0;
}
