import path from "node:path";
import { getDb } from "../../db";

const KNOWLEDGE_DIR = path.resolve(import.meta.dir, "../../../data/knowledge");

export interface ReviewCard {
  cardId: string;
  userId: string;
  knowledgePointId: string;
  ease: number;
  interval: number;
  dueDate: string;
  reps: number;
  lapses: number;
}

export interface ReviewCardWithKnowledgePoint {
  cardId: string;
  userId: string;
  knowledgePointId: string;
  ease: number;
  interval: number;
  dueDate: string;
  reps: number;
  lapses: number;
  title: string;
  content: string;
  examWeight: number;
  chapterId: string;
  chapterTitle: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKnowledgePointArray(
  value: unknown,
): value is Array<{ id: string; title: string; examWeight: number; file: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.examWeight === "number" &&
        typeof item.file === "string",
    )
  );
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function generateCardId(): string {
  return crypto.randomUUID();
}

export function initCard(userId: string, knowledgePointId: string): ReviewCard {
  const db = getDb();
  const existing = db
    .query<ReviewCard, [string, string]>(
      `SELECT card_id AS cardId, user_id AS userId, knowledge_point_id AS knowledgePointId,
              ease, interval, due_date AS dueDate, reps, lapses
       FROM review_cards
       WHERE user_id = ? AND knowledge_point_id = ?;`,
    )
    .get(userId, knowledgePointId);

  if (existing) {
    return existing;
  }

  const cardId = generateCardId();
  const dueDate = todayIso();
  db.run(
    `INSERT INTO review_cards (card_id, user_id, knowledge_point_id, ease, interval, due_date, reps, lapses)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [cardId, userId, knowledgePointId, 2.5, 1, dueDate, 0, 0],
  );

  return {
    cardId,
    userId,
    knowledgePointId,
    ease: 2.5,
    interval: 1,
    dueDate,
    reps: 0,
    lapses: 0,
  };
}

export function processReview(cardId: string, score: number): ReviewCard {
  const db = getDb();
  const card = db
    .query<ReviewCard, [string]>(
      `SELECT card_id AS cardId, user_id AS userId, knowledge_point_id AS knowledgePointId,
              ease, interval, due_date AS dueDate, reps, lapses
       FROM review_cards
       WHERE card_id = ?;`,
    )
    .get(cardId);

  if (!card) {
    throw new Error("Review card not found");
  }

  let ease = card.ease;
  let interval = card.interval;
  let reps = card.reps;
  let lapses = card.lapses;

  if (score <= 2) {
    interval = 1;
    ease = Math.max(1.3, ease * 0.8);
    lapses += 1;
  } else if (score === 3) {
    interval = Math.ceil(interval * 1.2);
    reps += 1;
  } else if (score === 4) {
    interval = Math.ceil(interval * ease);
    reps += 1;
  } else if (score === 5) {
    interval = Math.ceil(interval * ease);
    ease = Math.min(3.0, ease * 1.3);
    reps += 1;
  } else {
    throw new Error("Invalid score: must be 0-5");
  }

  ease = Math.max(1.3, Math.min(3.0, ease));
  const dueDate = addDaysIso(interval);

  db.run(
    `UPDATE review_cards
     SET ease = ?, interval = ?, due_date = ?, reps = ?, lapses = ?
     WHERE card_id = ?;`,
    [ease, interval, dueDate, reps, lapses, cardId],
  );

  return {
    ...card,
    ease,
    interval,
    dueDate,
    reps,
    lapses,
  };
}

export function getDueCards(userId: string, limit = 50): ReviewCard[] {
  const db = getDb();
  const today = todayIso();
  return db
    .query<ReviewCard, [string, string, number]>(
      `SELECT card_id AS cardId, user_id AS userId, knowledge_point_id AS knowledgePointId,
              ease, interval, due_date AS dueDate, reps, lapses
       FROM review_cards
       WHERE user_id = ? AND due_date <= ?
       ORDER BY due_date ASC, card_id ASC
       LIMIT ?;`,
    )
    .all(userId, today, limit);
}

function chapterDirName(chapterId: string): string {
  const num = chapterId.replace(/^chapter-/, "").replace(/^0+/, "");
  const padded = num.padStart(2, "0");
  return `chapter-${padded}`;
}

export async function getCardWithKnowledgePoint(
  cardId: string,
): Promise<ReviewCardWithKnowledgePoint | null> {
  const db = getDb();
  const card = db
    .query<ReviewCard, [string]>(
      `SELECT card_id AS cardId, user_id AS userId, knowledge_point_id AS knowledgePointId,
              ease, interval, due_date AS dueDate, reps, lapses
       FROM review_cards
       WHERE card_id = ?;`,
    )
    .get(cardId);

  if (!card) return null;

  const match = card.knowledgePointId.match(/^kp-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid knowledge point id: ${card.knowledgePointId}`);
  }
  const chapterNum = match[1];
  const chapterId = `chapter-${chapterNum}`;

  const chapterIndexFile = Bun.file(
    path.join(KNOWLEDGE_DIR, chapterDirName(chapterId), "index.json"),
  );
  let title = card.knowledgePointId;
  let examWeight = 3;
  let mdFile = `${card.knowledgePointId}.md`;
  let chapterTitle = `第${parseInt(chapterNum, 10)}章`;

  if (await chapterIndexFile.exists()) {
    try {
      const parsed: unknown = JSON.parse(await chapterIndexFile.text());
      if (isRecord(parsed)) {
        if (typeof parsed.title === "string") {
          chapterTitle = parsed.title;
        }
        const knowledgePoints = parsed.knowledgePoints;
        if (isKnowledgePointArray(knowledgePoints)) {
          const kp = knowledgePoints.find((p) => p.id === card.knowledgePointId);
          if (kp) {
            title = kp.title;
            examWeight = kp.examWeight ?? 3;
            mdFile = kp.file;
          }
        }
      }
    } catch {
      // fall back to defaults
    }
  }

  const mdFileObj = Bun.file(path.join(KNOWLEDGE_DIR, chapterDirName(chapterId), mdFile));
  let content = "";
  if (await mdFileObj.exists()) {
    content = await mdFileObj.text();
  }

  return {
    ...card,
    title,
    content,
    examWeight,
    chapterId,
    chapterTitle,
  };
}
