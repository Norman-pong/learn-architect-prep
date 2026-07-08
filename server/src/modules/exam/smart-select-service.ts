import { getDb } from "../../db";
import { loadQuestions, toPublicQuestion, type QuizQuestion, type PublicQuestion } from "../quiz/quiz-service";
import { getWeakPoints, type WeakPoint } from "../stats/weakness-service";
import { getConfig, getDecryptedKey } from "../ai/ai-config-service";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import type { Provider } from "@archprep/shared";

export interface SmartSelectResult {
  questions: PublicQuestion[];
  weakPoint: {
    chapterId: string;
    chapterName: string;
    correctRate: number;
  };
  source: "local" | "ai-assisted";
  reason: string;
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

function normalizeChapterId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("ch")) return trimmed;
  const parts = trimmed.split(".");
  const main = parts[0].replace(/^0+/, "") || "0";
  return `ch${main.padStart(2, "0")}`;
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
 * Select questions for a weak point using local filtering first.
 * If the chapter has <5 questions, optionally use AI to find the most relevant
 * from the entire pool (without generating new questions).
 */
export async function selectQuestionsForWeakPoint(
  userId: string,
  weakPoint: WeakPoint,
): Promise<SmartSelectResult> {
  const allQuestions = await loadQuestions();
  const chId = normalizeChapterId(weakPoint.chapterId);

  // 1. Filter questions from the same chapter
  let chapterPool = allQuestions.filter((q) => normalizeChapterId(q.chapter) === chId);

  // 2. Get user's answered question IDs and error question IDs
  const db = getDb();
  const answeredRows = db
    .query<{ question_id: string }, [string]>(
      `SELECT DISTINCT question_id FROM quiz_records WHERE user_id = ?`,
    )
    .all(userId);
  const answeredIds = new Set(answeredRows.map((r) => r.question_id));

  const errorRows = db
    .query<{ question_id: string }, [string]>(
      `SELECT question_id FROM quiz_records WHERE user_id = ? AND is_correct = 0`,
    )
    .all(userId);
  const errorIds = new Set(errorRows.map((r) => r.question_id));

  // 3. Scoring function for prioritization
  function scoreQuestion(q: QuizQuestion): number {
    let score = 0;
    // Prioritize unanswered questions
    if (!answeredIds.has(q.id)) score += 10;
    // Prioritize error questions
    if (errorIds.has(q.id)) score += 8;
    // Match difficulty based on correct rate
    if (weakPoint.correctRate < 40) {
      // Very weak: prioritize easy/medium to build confidence
      if (q.difficulty === "easy") score += 5;
      if (q.difficulty === "medium") score += 3;
    } else if (weakPoint.correctRate < 60) {
      // Weak: prioritize medium
      if (q.difficulty === "medium") score += 5;
      if (q.difficulty === "easy") score += 3;
    }
    return score;
  }

  // 4. If we have enough chapter questions, sort and pick locally
  const targetCount = Math.min(10, Math.max(5, chapterPool.length));

  if (chapterPool.length >= 5) {
    const scored = chapterPool.map((q) => ({ q, score: scoreQuestion(q) }));
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, targetCount).map((s) => s.q);
    return {
      questions: selected.map(toPublicQuestion),
      weakPoint: {
        chapterId: weakPoint.chapterId,
        chapterName: weakPoint.chapterName,
        correctRate: weakPoint.correctRate,
      },
      source: "local",
      reason: `从${weakPoint.chapterName}本地题库筛选${selected.length}道推荐题目，优先未做过/做错的题`,
    };
  }

  // 5. If <5 questions in chapter, use AI to find most relevant from full pool
  const config = getConfig(userId);
  const apiKey = getDecryptedKey(userId);

  if (!config || !apiKey) {
    // Fallback: return what we have + random from other chapters
    const needed = 5 - chapterPool.length;
    const otherPool = allQuestions.filter((q) => normalizeChapterId(q.chapter) !== chId);
    const extra = shuffle(otherPool).slice(0, needed);
    const combined = [...chapterPool, ...extra];
    return {
      questions: combined.map(toPublicQuestion),
      weakPoint: {
        chapterId: weakPoint.chapterId,
        chapterName: weakPoint.chapterName,
        correctRate: weakPoint.correctRate,
      },
      source: "local",
      reason: `${weakPoint.chapterName}本地题库仅${chapterPool.length}题，补充其他章节题目`,
    };
  }

  // Build prompt for AI selection
  const candidatePool = allQuestions.map((q) => ({
    id: q.id,
    question: q.question.substring(0, 120),
    chapter: q.chapter,
    difficulty: q.difficulty,
  }));

  const prompt = `你是一位系统架构设计师备考辅导专家。

薄弱知识点：${weakPoint.chapterName}（第${chId}章）
当前正确率：${weakPoint.correctRate}%

请从以下题库中筛选最相关的5-10道题目推荐给用户练习。
要求：
1. 优先选择同章节的题目
2. 如果同章节不足，选择内容最相关的其他章节题目
3. 不生成新题，只从已有题库中选择
4. 返回题目ID列表

题库候选（共${candidatePool.length}题）：
${candidatePool.map((q) => `- ID:${q.id} | 章节:${q.chapter} | 难度:${q.difficulty} | ${q.question}`).join("\n")}

请直接输出JSON格式（不要添加markdown代码块）：
{
  "selectedIds": ["id1", "id2", ...],
  "reason": "简要说明选题理由"
}`;

  try {
    const provider = createProvider(config.provider, apiKey, config.baseUrl);
    const model = provider(config.model ?? "gpt-4o-mini");

    const { text } = await generateText({
      model,
      prompt,
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const parsed: unknown = JSON.parse(jsonStr);
    if (!isRecord(parsed) || !Array.isArray(parsed.selectedIds)) {
      throw new Error("Invalid AI response format");
    }
    const aiResult = {
      selectedIds: parsed.selectedIds.filter((id): id is string => typeof id === "string"),
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };

    const selectedIds = new Set(aiResult.selectedIds.slice(0, 10));
    const selected = allQuestions.filter((q) => selectedIds.has(q.id));

    // If AI returned fewer than 5, supplement with local logic
    if (selected.length < 5) {
      const remaining = allQuestions.filter((q) => !selectedIds.has(q.id));
      const scored = remaining.map((q) => ({ q, score: scoreQuestion(q) }));
      scored.sort((a, b) => b.score - a.score);
      const extra = scored.slice(0, 5 - selected.length).map((s) => s.q);
      selected.push(...extra);
    }

    return {
      questions: selected.map(toPublicQuestion),
      weakPoint: {
        chapterId: weakPoint.chapterId,
        chapterName: weakPoint.chapterName,
        correctRate: weakPoint.correctRate,
      },
      source: "ai-assisted",
      reason: aiResult.reason || `AI辅助从题库筛选${selected.length}道相关题目`,
    };
  } catch {
    // AI fallback: return best local matches
    const scored = allQuestions.map((q) => ({ q, score: scoreQuestion(q) }));
    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, 10).map((s) => s.q);

    return {
      questions: selected.map(toPublicQuestion),
      weakPoint: {
        chapterId: weakPoint.chapterId,
        chapterName: weakPoint.chapterName,
        correctRate: weakPoint.correctRate,
      },
      source: "local",
      reason: `AI辅助失败，从题库本地筛选${selected.length}道相关题目`,
    };
  }
}

/**
 * Select questions by weakPointId (chapter identifier).
 * Looks up the weak point from user's weakness data.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function selectQuestionsByWeakPointId(
  userId: string,
  weakPointId?: string,
): Promise<SmartSelectResult> {
  const weakPoints = await getWeakPoints(userId);

  if (weakPointId) {
    const target = weakPoints.find((wp) => wp.chapterId === weakPointId);
    if (target) {
      return selectQuestionsForWeakPoint(userId, target);
    }
  }

  // If no weakPointId specified or not found, pick the weakest point
  const weakest = weakPoints
    .filter((wp) => wp.isWeak)
    .toSorted((a, b) => a.correctRate - b.correctRate)[0];
  if (weakest) {
    return selectQuestionsForWeakPoint(userId, weakest);
  }

  // Fallback: return random questions if no weak points
  const allQuestions = await loadQuestions();
  const selected = shuffle(allQuestions).slice(0, 10);
  return {
    questions: selected.map(toPublicQuestion),
    weakPoint: {
      chapterId: "",
      chapterName: "综合推荐",
      correctRate: 0,
    },
    source: "local",
    reason: "暂无薄弱知识点，随机推荐10道题目",
  };
}
