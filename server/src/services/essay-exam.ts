import { getDb } from "../db";
import { startExam, getExamById, finishExam, type ExamRecord } from "./exam";
import { scoreEssay } from "./ai-scoring";
import { upsertWriting } from "./writings";
import type { ThesisSections } from "@archprep/shared";

export interface EssayQuestion {
  id: string;
  title: string;
  requirements: string[];
  referenceOutline?: string;
  source: string;
  year: number | null;
  hash: string;
}

export interface EssayExamPaper {
  examId: string;
  questions: EssayQuestion[];
  duration: number; // minutes
  remainingTime: number; // seconds
}

export interface EssayExamReport {
  examId: string;
  score: number;
  total: number;
  passLine: number;
  passed: boolean;
  duration: number; // seconds
  writingId: string;
  selectedQuestionId: string;
  dimensions: Array<{
    name: string;
    weight: number;
    score: number;
    maxScore: number;
    comment: string;
  }>;
  sectionFeedbacks: Array<{
    section: string;
    comment: string;
    suggestions: string[];
  }>;
  deductions: Array<{
    reason: string;
    severity: "minor" | "major" | "critical";
    suggestion: string;
  }>;
  overallComment: string;
  improvementSuggestions: string[];
}

interface EssayDataFile {
  version: number;
  updatedAt: string;
  essays: EssayQuestion[];
}

const PASS_LINE = 45;
const TOTAL_SCORE = 75;

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEssayDataFile(value: unknown): value is EssayDataFile {
  return (
    isRecord(value) &&
    typeof value.version === "number" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.essays)
  );
}

function isEssaySnapshot(value: unknown): value is EssaySnapshot {
  return isRecord(value);
}

function isEssayDimension(
  value: unknown,
): value is EssayExamReport["dimensions"][number] {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.weight === "number" &&
    typeof value.score === "number" &&
    typeof value.maxScore === "number" &&
    typeof value.comment === "string"
  );
}

function isEssaySectionFeedback(
  value: unknown,
): value is EssayExamReport["sectionFeedbacks"][number] {
  return (
    isRecord(value) &&
    typeof value.section === "string" &&
    typeof value.comment === "string" &&
    isStringArray(value.suggestions)
  );
}

function isEssayDeduction(
  value: unknown,
): value is EssayExamReport["deductions"][number] {
  return (
    isRecord(value) &&
    typeof value.reason === "string" &&
    typeof value.suggestion === "string" &&
    (value.severity === "minor" || value.severity === "major" || value.severity === "critical")
  );
}

function isEssayExamReport(value: unknown): value is EssayExamReport {
  return (
    isRecord(value) &&
    typeof value.examId === "string" &&
    typeof value.score === "number" &&
    typeof value.total === "number" &&
    typeof value.passLine === "number" &&
    typeof value.passed === "boolean" &&
    typeof value.duration === "number" &&
    typeof value.writingId === "string" &&
    typeof value.selectedQuestionId === "string" &&
    Array.isArray(value.dimensions) &&
    value.dimensions.every(isEssayDimension) &&
    Array.isArray(value.sectionFeedbacks) &&
    value.sectionFeedbacks.every(isEssaySectionFeedback) &&
    Array.isArray(value.deductions) &&
    value.deductions.every(isEssayDeduction) &&
    typeof value.overallComment === "string" &&
    isStringArray(value.improvementSuggestions)
  );
}

let cachedEssays: EssayQuestion[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5_000;

const ESSAYS_FILE_PATH = `${import.meta.dir}/../../../data/quiz/essays.json`;

async function loadEssays(): Promise<EssayQuestion[]> {
  if (cachedEssays && Date.now() - cacheTime < CACHE_TTL_MS) {
    return cachedEssays;
  }

  const file = Bun.file(ESSAYS_FILE_PATH);
  if (!(await file.exists())) {
    cachedEssays = [];
    cacheTime = Date.now();
    return cachedEssays;
  }

  try {
    const raw: unknown = await file.json();
    if (isEssayDataFile(raw)) {
      cachedEssays = raw.essays.map(normalizeEssay).filter((e): e is EssayQuestion => e !== null);
    } else {
      cachedEssays = [];
    }
  } catch {
    cachedEssays = [];
  }

  cacheTime = Date.now();
  return cachedEssays;
}

function normalizeEssay(raw: unknown): EssayQuestion | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  const requirements = Array.isArray(raw.requirements)
    ? raw.requirements.map((r) => (typeof r === "string" ? r : ""))
    : [];
  const referenceOutline = typeof raw.referenceOutline === "string" ? raw.referenceOutline : undefined;
  const source = typeof raw.source === "string" ? raw.source : "";
  const year = Number(raw.year ?? 0) || null;
  const hash = typeof raw.hash === "string" ? raw.hash : "";

  if (!id || !title) return null;

  return { id, title, requirements, referenceOutline, source, year, hash };
}

function shuffle<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Start a new essay exam and draw 4 questions from the essay question bank.
 */
export async function generateEssayExam(userId: string): Promise<ExamRecord> {
  const essays = await loadEssays();
  if (essays.length === 0) {
    throw new Error("ESSAY_BANK_EMPTY");
  }

  const record = await startExam(userId, "essay", "single");
  const selected = shuffle(essays).slice(0, 4);
  const questionIds = selected.map((e) => e.id);

  const snapshot = { ...record.answersSnapshot, questionIds };

  const db = getDb();
  db.prepare("UPDATE exam_records SET answers_snapshot = ? WHERE id = ? AND user_id = ?;").run(
    JSON.stringify(snapshot),
    record.id,
    userId,
  );

  return { ...record, answersSnapshot: snapshot };
}

/**
 * Generate the paper (4 questions) for an existing essay exam.
 */
export async function generateExamPaper(
  userId: string,
  examId: string,
): Promise<EssayExamPaper | null> {
  const exam = await getExamById(userId, examId);
  if (!exam || exam.examType !== "essay") return null;

  const essays = await loadEssays();
  const essayMap = new Map(essays.map((e) => [e.id, e]));

  const questionIds = isStringArray(exam.answersSnapshot.questionIds)
    ? exam.answersSnapshot.questionIds
    : [];
  const questions = questionIds
    .map((id) => essayMap.get(id))
    .filter((e): e is EssayQuestion => e !== undefined);

  return { examId, questions, duration: exam.duration, remainingTime: exam.remainingTime };
}

interface EssaySnapshot {
  questionIds?: string[];
  selectedQuestionId: string;
  sections: Record<string, string>;
  writingId: string;
}

function normalizeSections(input: Record<string, string>): ThesisSections {
  return {
    summary: input.summary ?? "",
    background: input.background ?? "",
    solution: input.solution ?? "",
    reflection: input.reflection ?? "",
    conclusion: input.conclusion ?? "",
  };
}

/**
 * Submit or update the essay content during the exam.
 */
export async function submitEssay(
  userId: string,
  examId: string,
  selectedQuestionId: string,
  sections: Record<string, string>,
): Promise<{ success: boolean }> {
  const exam = await getExamById(userId, examId);
  if (!exam || exam.examType !== "essay" || exam.status !== "in_progress") {
    return { success: false };
  }

  const essays = await loadEssays();
  const questionIds = isStringArray(exam.answersSnapshot.questionIds)
    ? exam.answersSnapshot.questionIds
    : [];
  if (!questionIds.includes(selectedQuestionId)) {
    return { success: false };
  }

  const selectedEssay = essays.find((e) => e.id === selectedQuestionId);
  if (!selectedEssay) {
    return { success: false };
  }

  const normalized = normalizeSections(sections);
  const writing = upsertWriting(userId, { title: selectedEssay.title, sections: normalized });

  const snapshot = {
    ...exam.answersSnapshot,
    selectedQuestionId,
    sections: normalized,
    writingId: writing.id,
  };

  const db = getDb();
  db.prepare("UPDATE exam_records SET answers_snapshot = ? WHERE id = ? AND user_id = ?;").run(
    JSON.stringify(snapshot),
    examId,
    userId,
  );

  return { success: true };
}

/**
 * Finish the essay exam and grade it with AI 5-dimension scoring.
 * If AI config/key is missing, the exam is finished with a null score
 * and the writing is still saved.
 */
export async function gradeEssayExam(
  userId: string,
  examId: string,
): Promise<EssayExamReport | null> {
  const exam = await getExamById(userId, examId);
  if (!exam || exam.examType !== "essay" || exam.status !== "in_progress") {
    return null;
  }

  const snapshot = isEssaySnapshot(exam.answersSnapshot) ? exam.answersSnapshot : null;
  if (!snapshot) {
    return null;
  }
  const selectedQuestionId = snapshot.selectedQuestionId;
  const sections = snapshot.sections;
  const writingId = snapshot.writingId;

  if (!selectedQuestionId || !sections || !writingId) {
    return null;
  }

  const typedSections = sections as Record<string, string>;
  const essays = await loadEssays();
  const selectedEssay = essays.find((e) => e.id === selectedQuestionId);
  if (!selectedEssay) {
    return null;
  }

  upsertWriting(userId, {
    id: writingId,
    title: selectedEssay.title,
    sections: typedSections as ThesisSections,
  });

  let score: number | null = null;
  let dimensions: EssayExamReport["dimensions"] = [];
  let sectionFeedbacks: EssayExamReport["sectionFeedbacks"] = [];
  let deductions: EssayExamReport["deductions"] = [];
  let overallComment = "";
  let improvementSuggestions: string[] = [];

  try {
    const { stream, resultPromise } = await scoreEssay(userId, writingId);
    for await (const _ of stream) {
      // consume stream to drive scoring
    }
    const result = await resultPromise;
    score = result.totalScore;
    dimensions = result.dimensions;
    sectionFeedbacks = result.sectionFeedbacks;
    deductions = result.deductions;
    overallComment = result.overallComment;
    improvementSuggestions = result.improvementSuggestions;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === "AI_CONFIG_MISSING" || message === "AI_KEY_MISSING") {
      score = null;
    } else {
      throw err;
    }
  }

  const finishedRecord = await finishExam(
    userId,
    examId,
    { ...snapshot },
    score ?? undefined,
  );
  if (!finishedRecord) return null;

  const startedAt = new Date(exam.startedAt).getTime();
  const finishedAt = finishedRecord.finishedAt
    ? new Date(finishedRecord.finishedAt).getTime()
    : Date.now();
  const durationSec = Math.max(0, Math.floor((finishedAt - startedAt) / 1000));

  const detail = {
    questionIds: snapshot.questionIds,
    selectedQuestionId,
    writingId,
    score,
    passLine: PASS_LINE,
    passed: score !== null ? score >= PASS_LINE : false,
    duration: durationSec,
    dimensions,
    sectionFeedbacks,
    deductions,
    overallComment,
    improvementSuggestions,
  };

  const db = getDb();
  db.prepare("UPDATE exam_records SET detail_json = ? WHERE id = ? AND user_id = ?;").run(
    JSON.stringify(detail),
    examId,
    userId,
  );

  return {
    examId,
    score: score ?? 0,
    total: TOTAL_SCORE,
    passLine: PASS_LINE,
    passed: score !== null ? score >= PASS_LINE : false,
    duration: durationSec,
    writingId,
    selectedQuestionId,
    dimensions,
    sectionFeedbacks,
    deductions,
    overallComment,
    improvementSuggestions,
  };
}

export async function getExamReport(
  userId: string,
  examId: string,
): Promise<EssayExamReport | null> {
  const exam = await getExamById(userId, examId);
  if (!exam || exam.examType !== "essay") return null;

  const detail = exam.detailJson && isEssayExamReport(exam.detailJson) ? exam.detailJson : null;
  if (!detail) return null;

  return detail;
}
