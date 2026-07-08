import { getDb } from "../db";
import { randomUUID } from "node:crypto";
import { loadCaseQuestions } from "./quiz";
import { getConfig, getDecryptedKey } from "./ai-config";
import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { Provider } from "@archprep/shared";

export interface CaseQuestion {
  id: string;
  question: string;
  referenceAnswer: string;
  chapter: string;
  difficulty: "easy" | "medium" | "hard";
  source: string;
  year: number;
}

export interface CaseExamPaper {
  examId: string;
  questions: CaseQuestion[];
  duration: number;
  remainingTime: number;
}

export interface CaseAnswer {
  questionId: string;
  answer: string;
  mermaid?: string;
}

export interface CaseScoreDimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  comment: string;
}

export interface CaseScoreResult {
  totalScore: number;
  maxTotalScore: number;
  dimensions: CaseScoreDimension[];
  overallComment: string;
  improvementSuggestions: string[];
}

export interface CaseExamReport {
  examId: string;
  score: number;
  maxTotalScore: number;
  passLine: number;
  passed: boolean;
  dimensions: CaseScoreDimension[];
  overallComment: string;
  improvementSuggestions: string[];
  answers: Record<string, { answer: string; mermaid?: string }>;
}

const CASE_DIMENSION_CONFIG: {
  name: string;
  weight: number;
  maxScore: number;
  description: string;
}[] = [
  {
    name: "采分点覆盖度",
    weight: 60,
    maxScore: 45,
    description: "是否覆盖参考答案中的关键采分点",
  },
  {
    name: "技术准确性",
    weight: 20,
    maxScore: 15,
    description: "架构选择/技术方案是否正确",
  },
  {
    name: "逻辑完整性",
    weight: 10,
    maxScore: 7.5,
    description: "答题逻辑是否完整、自洽",
  },
  {
    name: "表达规范",
    weight: 10,
    maxScore: 7.5,
    description: "专业术语、结构清晰度",
  },
];

const PASS_LINE = 45;
const MAX_TOTAL_SCORE = 75;

function shuffle<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createProvider(provider: Provider, apiKey: string, baseUrl?: string) {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey, baseURL: baseUrl });
    case "anthropic":
      return createAnthropic({ apiKey, baseURL: baseUrl });
    case "deepseek":
      return createDeepSeek({ apiKey, baseURL: baseUrl });
    case "minimax":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.minimax.chat/v1" });
    case "kimi":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.moonshot.cn/v1" });
    case "custom":
      return createOpenAI({ apiKey, baseURL: baseUrl });
    default:
      return createOpenAI({ apiKey, baseURL: baseUrl });
  }
}

function buildCaseScoringPrompt(
  question: string,
  referenceAnswer: string,
  userAnswer: string,
  mermaid?: string,
): string {
  const dimensionDescriptions = CASE_DIMENSION_CONFIG.map(
    (d) => `- ${d.name}（权重 ${d.weight}%，满分 ${d.maxScore}分）：${d.description}`,
  ).join("\n");

  const mermaidPart = mermaid ? `\n## 用户提供的 Mermaid 图\n${mermaid}\n` : "";

  return `你是一位资深的系统架构设计师考试阅卷专家。请对以下案例分析题进行4维度评分。

## 题目
${question}

## 参考答案
${referenceAnswer}

## 用户答案
${userAnswer}${mermaidPart}

## 评分维度（总分75分，合格线45分）
${dimensionDescriptions}

## 输出格式要求
请严格按照以下JSON格式输出（不要添加markdown代码块标记，直接输出JSON）：

{
  "totalScore": <总分>,
  "dimensions": [
    {"name": "采分点覆盖度", "score": <0-45>, "comment": "..."},
    {"name": "技术准确性", "score": <0-15>, "comment": "..."},
    {"name": "逻辑完整性", "score": <0-7.5>, "comment": "..."},
    {"name": "表达规范", "score": <0-7.5>, "comment": "..."}
  ],
  "overallComment": "总体评价...",
  "improvementSuggestions": ["建议1", "建议2", "..."]
}

注意：
- 评分要客观公正，参考软考系统架构设计师案例分析评分标准
- 每个维度的comment要具体指出优点和不足
- improvementSuggestions要给出3-5条具体可操作的改进建议`;
}

function parseCaseScoreResult(text: string): CaseScoreResult {
  let jsonStr = text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  const dimensions: CaseScoreDimension[] = (parsed.dimensions ?? []).map(
    (d: Record<string, unknown>) => ({
      name: String(d.name ?? ""),
      weight: CASE_DIMENSION_CONFIG.find((c) => c.name === d.name)?.weight ?? 0,
      score: Number(d.score ?? 0),
      maxScore: CASE_DIMENSION_CONFIG.find((c) => c.name === d.name)?.maxScore ?? 0,
      comment: String(d.comment ?? ""),
    }),
  );

  for (const config of CASE_DIMENSION_CONFIG) {
    if (!dimensions.find((d) => d.name === config.name)) {
      dimensions.push({
        name: config.name,
        weight: config.weight,
        score: 0,
        maxScore: config.maxScore,
        comment: "未评分",
      });
    }
  }

  return {
    totalScore: Number(parsed.totalScore ?? 0),
    maxTotalScore: MAX_TOTAL_SCORE,
    dimensions,
    overallComment: String(parsed.overallComment ?? ""),
    improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
      ? parsed.improvementSuggestions.map(String)
      : [],
  };
}

function recordAiUsage(
  userId: string,
  feature: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const db = getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const pricing: Record<string, { input: number; output: number }> = {
    openai: { input: 0.0015, output: 0.002 },
    anthropic: { input: 0.003, output: 0.015 },
    deepseek: { input: 0.00014, output: 0.00028 },
    minimax: { input: 0.001, output: 0.001 },
    kimi: { input: 0.003, output: 0.003 },
    custom: { input: 0.002, output: 0.002 },
  };
  const p = pricing[provider] ?? pricing.custom;
  const costEstimate = (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;

  db.query(
    `INSERT INTO ai_usage (id, user_id, feature, provider, model, input_tokens, output_tokens, cost_estimate, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, feature, provider, model, inputTokens, outputTokens, costEstimate, createdAt);
}

async function scoreSingleCase(
  userId: string,
  question: CaseQuestion,
  answer: string,
  mermaid?: string,
): Promise<CaseScoreResult> {
  const config = getConfig(userId);
  if (!config) {
    throw new Error("AI_CONFIG_MISSING");
  }

  const apiKey = getDecryptedKey(userId);
  if (!apiKey) {
    throw new Error("AI_KEY_MISSING");
  }

  const provider = config.provider;
  const model = config.model ?? "gpt-4o-mini";
  const baseUrl = config.baseUrl;

  const aiProvider = createProvider(provider, apiKey, baseUrl);

  const prompt = buildCaseScoringPrompt(
    question.question,
    question.referenceAnswer,
    answer,
    mermaid,
  );
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: "你是一位资深的系统架构设计师考试阅卷专家。请严格按照JSON格式输出评分结果。",
    },
    { role: "user", content: prompt },
  ];

  async function tryScoreWithRetry(): Promise<{
    textStream: AsyncIterable<string>;
    usage: PromiseLike<{ inputTokens?: number; outputTokens?: number }>;
  }> {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { textStream, usage } = streamText({
          model: aiProvider(model),
          messages,
          maxOutputTokens: 4000,
          abortSignal: AbortSignal.timeout(30000),
        });
        return { textStream, usage };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (lastError.name !== "TimeoutError" && !lastError.message.includes("timeout")) {
          throw lastError;
        }
        if (attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError ?? new Error("AI_TIMEOUT");
  }

  const { textStream, usage } = await tryScoreWithRetry();

  let fullText = "";
  for await (const chunk of textStream) {
    fullText += chunk;
  }

  const result = parseCaseScoreResult(fullText);

  try {
    const u = await usage;
    recordAiUsage(userId, "case_scoring", provider, model, u.inputTokens ?? 0, u.outputTokens ?? 0);
  } catch {
    // best-effort
  }

  return result;
}

export async function generateCaseExam(
  userId: string,
): Promise<{ examId: string; questionIds: string[] }> {
  const all = await loadCaseQuestions();
  const shuffled = shuffle(all);
  const selected = shuffled.slice(0, 5);
  const questionIds = selected.map((q) => q.id);

  const db = getDb();
  const examId = randomUUID();
  const duration = 90;
  const remainingTime = duration * 60;
  const startedAt = new Date().toISOString();

  const snapshot = {
    questionIds,
    answers: {} as Record<string, { answer: string; mermaid?: string }>,
  };

  db.prepare(
    `INSERT INTO exam_records (
      id, user_id, exam_type, mode, status, score, duration, remaining_time, answers_snapshot, started_at, finished_at, detail_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
  ).run(
    examId,
    userId,
    "case",
    "single",
    "in_progress",
    null,
    duration,
    remainingTime,
    JSON.stringify(snapshot),
    startedAt,
    null,
    JSON.stringify({ questionIds, section: "case" }),
  );

  return { examId, questionIds };
}

export async function getCaseExamPaper(
  userId: string,
  examId: string,
): Promise<CaseExamPaper | null> {
  const db = getDb();
  const row = db
    .query<
      {
        id: string;
        user_id: string;
        exam_type: string;
        status: string;
        duration: number;
        remaining_time: number;
        answers_snapshot: string;
      },
      [string, string]
    >(
      "SELECT id, user_id, exam_type, status, duration, remaining_time, answers_snapshot FROM exam_records WHERE id = ? AND user_id = ?;",
    )
    .get(examId, userId);

  if (!row || row.exam_type !== "case") return null;

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    questionIds?: string[];
  };

  const all = await loadCaseQuestions();
  const questions = (snapshot.questionIds ?? [])
    .map((id) => all.find((q) => q.id === id))
    .filter((q): q is CaseQuestion => q !== undefined);

  return {
    examId: row.id,
    questions,
    duration: row.duration,
    remainingTime: row.remaining_time,
  };
}

export async function submitCaseAnswer(
  userId: string,
  examId: string,
  questionId: string,
  answer: string,
  mermaid?: string,
): Promise<{ success: boolean }> {
  const db = getDb();
  const row = db
    .query<{ answers_snapshot: string }, [string, string]>(
      "SELECT answers_snapshot FROM exam_records WHERE id = ? AND user_id = ? AND status = 'in_progress';",
    )
    .get(examId, userId);

  if (!row) return { success: false };

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    answers?: Record<string, { answer: string; mermaid?: string }>;
  };

  const answers = snapshot.answers ?? {};
  answers[questionId] = { answer, mermaid };

  db.prepare("UPDATE exam_records SET answers_snapshot = ? WHERE id = ? AND user_id = ?;").run(
    JSON.stringify({ ...snapshot, answers }),
    examId,
    userId,
  );

  return { success: true };
}

export async function gradeCaseExam(
  userId: string,
  examId: string,
): Promise<CaseExamReport | null> {
  const db = getDb();
  const row = db
    .query<
      {
        id: string;
        user_id: string;
        status: string;
        duration: number;
        answers_snapshot: string;
      },
      [string, string]
    >(
      "SELECT id, user_id, status, duration, answers_snapshot FROM exam_records WHERE id = ? AND user_id = ?;",
    )
    .get(examId, userId);

  if (!row || row.status !== "in_progress") return null;

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    questionIds?: string[];
    answers?: Record<string, { answer: string; mermaid?: string }>;
  };

  const all = await loadCaseQuestions();
  const answers = snapshot.answers ?? {};
  const questionIds = snapshot.questionIds ?? [];

  let totalScore = 0;
  const allDimensions: CaseScoreDimension[] = [];
  const allComments: string[] = [];
  const allSuggestions: string[] = [];

  for (const qid of questionIds) {
    const question = all.find((q) => q.id === qid);
    if (!question) continue;

    const ans = answers[qid];
    if (!ans || !ans.answer.trim()) {
      // unanswered question gets 0
      continue;
    }

    try {
      const result = await scoreSingleCase(userId, question, ans.answer, ans.mermaid);
      totalScore += result.totalScore;
      allDimensions.push(...result.dimensions);
      if (result.overallComment) allComments.push(result.overallComment);
      allSuggestions.push(...result.improvementSuggestions);
    } catch {
      // AI scoring failed, skip this question
    }
  }

  // Average dimensions across scored questions
  const dimensionMap = new Map<
    string,
    { weight: number; maxScore: number; scores: number[]; comments: string[] }
  >();
  for (const d of allDimensions) {
    const existing = dimensionMap.get(d.name);
    if (existing) {
      existing.scores.push(d.score);
      existing.comments.push(d.comment);
    } else {
      dimensionMap.set(d.name, {
        weight: d.weight,
        maxScore: d.maxScore,
        scores: [d.score],
        comments: [d.comment],
      });
    }
  }

  const averagedDimensions: CaseScoreDimension[] = [];
  for (const [name, data] of dimensionMap) {
    const avgScore =
      data.scores.length > 0 ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length : 0;
    const comment = data.comments.filter(Boolean).join("；") || "未评分";
    averagedDimensions.push({
      name,
      weight: data.weight,
      score: Math.round(avgScore * 10) / 10,
      maxScore: data.maxScore,
      comment,
    });
  }

  // Ensure all 4 dimensions present
  for (const config of CASE_DIMENSION_CONFIG) {
    if (!averagedDimensions.find((d) => d.name === config.name)) {
      averagedDimensions.push({
        name: config.name,
        weight: config.weight,
        score: 0,
        maxScore: config.maxScore,
        comment: "未评分",
      });
    }
  }

  const finalScore = Math.round(totalScore * 10) / 10;
  const passed = finalScore >= PASS_LINE;
  const finishedAt = new Date().toISOString();

  const detailJson = {
    questionIds,
    dimensions: averagedDimensions,
    overallComment: allComments.join("\n"),
    improvementSuggestions: [...new Set(allSuggestions)],
  };

  db.prepare(
    "UPDATE exam_records SET status = 'finished', finished_at = ?, score = ?, answers_snapshot = ?, detail_json = ? WHERE id = ? AND user_id = ?;",
  ).run(
    finishedAt,
    finalScore,
    JSON.stringify(snapshot),
    JSON.stringify(detailJson),
    examId,
    userId,
  );

  return {
    examId: row.id,
    score: finalScore,
    maxTotalScore: MAX_TOTAL_SCORE,
    passLine: PASS_LINE,
    passed,
    dimensions: averagedDimensions,
    overallComment: allComments.join("\n"),
    improvementSuggestions: [...new Set(allSuggestions)],
    answers,
  };
}

export async function getCaseExamReport(
  userId: string,
  examId: string,
): Promise<CaseExamReport | null> {
  const db = getDb();
  const row = db
    .query<
      {
        id: string;
        status: string;
        score: number | null;
        answers_snapshot: string;
        detail_json: string | null;
      },
      [string, string]
    >(
      "SELECT id, status, score, answers_snapshot, detail_json FROM exam_records WHERE id = ? AND user_id = ?;",
    )
    .get(examId, userId);

  if (!row) return null;

  const snapshot = JSON.parse(row.answers_snapshot || "{}") as {
    answers?: Record<string, { answer: string; mermaid?: string }>;
  };
  const detail = row.detail_json ? (JSON.parse(row.detail_json) as Record<string, unknown>) : null;

  const dimensions: CaseScoreDimension[] = (detail?.dimensions as CaseScoreDimension[]) ?? [];
  for (const config of CASE_DIMENSION_CONFIG) {
    if (!dimensions.find((d) => d.name === config.name)) {
      dimensions.push({
        name: config.name,
        weight: config.weight,
        score: 0,
        maxScore: config.maxScore,
        comment: "未评分",
      });
    }
  }

  return {
    examId: row.id,
    score: row.score ?? 0,
    maxTotalScore: MAX_TOTAL_SCORE,
    passLine: PASS_LINE,
    passed: (row.score ?? 0) >= PASS_LINE,
    dimensions,
    overallComment: String(detail?.overallComment ?? ""),
    improvementSuggestions: Array.isArray(detail?.improvementSuggestions)
      ? (detail?.improvementSuggestions as string[])
      : [],
    answers: snapshot.answers ?? {},
  };
}
