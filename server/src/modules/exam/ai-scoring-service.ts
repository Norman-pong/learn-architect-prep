import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { getDb } from "../../db";
import { getWriting } from "../writing/writings-service";
import { getConfig, getDecryptedKey } from "../ai/ai-config-service";
import type { Provider, ThesisSections, AiScoreSummary } from "@archprep/shared";

interface ScoreDimension {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  comment: string;
}

interface SectionFeedback {
  section: string;
  comment: string;
  suggestions: string[];
}

interface DeductionItem {
  reason: string;
  severity: "minor" | "major" | "critical";
  suggestion: string;
}

export interface EssayScoreResult {
  totalScore: number;
  maxTotalScore: number;
  dimensions: ScoreDimension[];
  sectionFeedbacks: SectionFeedback[];
  deductions: DeductionItem[];
  overallComment: string;
  improvementSuggestions: string[];
}

const DIMENSION_CONFIG: { name: string; weight: number; maxScore: number; description: string }[] =
  [
    {
      name: "切题度",
      weight: 30,
      maxScore: 30,
      description: "论文是否紧扣题目要求，论点与题目关联度",
    },
    {
      name: "应用深度",
      weight: 20,
      maxScore: 20,
      description: "技术方案深度、架构设计合理性、技术选型论证",
    },
    { name: "实践性", weight: 20, maxScore: 20, description: "项目经验真实性、实施细节、量化指标" },
    {
      name: "表达能力",
      weight: 15,
      maxScore: 15,
      description: "逻辑结构、语言流畅度、专业术语准确性",
    },
    {
      name: "综合能力",
      weight: 15,
      maxScore: 15,
      description: "问题分析全面性、创新思考、总结提炼",
    },
  ];

function buildScoringPrompt(title: string, sections: ThesisSections): string {
  const sectionLabels: Record<string, string> = {
    summary: "摘要",
    background: "项目背景",
    solution: "技术方案",
    reflection: "效果反思",
    conclusion: "结论",
  };

  const essayText = Object.entries(sections)
    .map(([key, text]) => `【${sectionLabels[key] ?? key}】\n${text}`)
    .join("\n\n");

  const dimensionDescriptions = DIMENSION_CONFIG.map(
    (d) => `- ${d.name}（权重 ${d.weight}%，满分 ${d.maxScore}分）：${d.description}`,
  ).join("\n");

  return `你是一位资深的系统架构设计师考试阅卷专家。请对以下论文进行5维度评分。

## 论文题目
${title}

## 论文正文
${essayText}

## 评分维度（总分75分，合格线45分）
${dimensionDescriptions}

## 扣分项检测规则
请检测以下问题并记录扣分：
1. 纯理论无项目：论文只有理论堆砌，没有具体项目背景和实践
2. 跑题：内容偏离题目要求，或各节之间缺乏逻辑关联
3. 字数不足：总字数明显不足2000字（摘要300-400字，背景400-600字，方案1000-1400字，反思200-400字，结论100-200字）
4. 无数字量化：缺少具体的性能指标、数据、时间、人数等量化描述

## 输出格式要求
请严格按照以下JSON格式输出（不要添加markdown代码块标记，直接输出JSON）：

{
  "totalScore": <总分>,
  "dimensions": [
    {"name": "切题度", "score": <0-30>, "comment": "..."},
    {"name": "应用深度", "score": <0-20>, "comment": "..."},
    {"name": "实践性", "score": <0-20>, "comment": "..."},
    {"name": "表达能力", "score": <0-15>, "comment": "..."},
    {"name": "综合能力", "score": <0-15>, "comment": "..."}
  ],
  "sectionFeedbacks": [
    {"section": "摘要", "comment": "...", "suggestions": ["..."]},
    {"section": "项目背景", "comment": "...", "suggestions": ["..."]},
    {"section": "技术方案", "comment": "...", "suggestions": ["..."]},
    {"section": "效果反思", "comment": "...", "suggestions": ["..."]},
    {"section": "结论", "comment": "...", "suggestions": ["..."]}
  ],
  "deductions": [
    {"reason": "...", "severity": "minor|major|critical", "suggestion": "..."}
  ],
  "overallComment": "总体评价...",
  "improvementSuggestions": ["建议1", "建议2", "..."]
}

注意：
- 评分要客观公正，参考软考系统架构设计师论文评分标准
- 每个维度的comment要具体指出优点和不足
- sectionFeedbacks要对每个段落给出具体点评和改进建议
- deductions如没有问题可留空数组
- improvementSuggestions要给出3-5条具体可操作的改进建议`;
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
      // MiniMax uses OpenAI-compatible API
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.minimax.chat/v1" });
    case "kimi":
      // Kimi (Moonshot) uses OpenAI-compatible API
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.moonshot.cn/v1" });
    case "custom":
      // Custom provider assumes OpenAI-compatible API
      return createOpenAI({ apiKey, baseURL: baseUrl });
    default:
      return createOpenAI({ apiKey, baseURL: baseUrl });
  }
}

function isSeverity(value: unknown): value is "minor" | "major" | "critical" {
  return value === "minor" || value === "major" || value === "critical";
}

function parseScoreResult(text: string): EssayScoreResult {
  // Try to extract JSON from the response (handle markdown code blocks)
  let jsonStr = text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  const dimensions: ScoreDimension[] = (parsed.dimensions ?? []).map(
    (d: Record<string, unknown>) => ({
      name: typeof d.name === "string" ? d.name : "",
      weight: DIMENSION_CONFIG.find((c) => c.name === d.name)?.weight ?? 0,
      score: Number(d.score ?? 0),
      maxScore: DIMENSION_CONFIG.find((c) => c.name === d.name)?.maxScore ?? 0,
      comment: typeof d.comment === "string" ? d.comment : "",
    }),
  );

  // Ensure all 5 dimensions are present
  for (const config of DIMENSION_CONFIG) {
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

  const totalScore = Number(parsed.totalScore ?? 0);
  const maxTotalScore = 75;

  return {
    totalScore,
    maxTotalScore,
    dimensions,
    sectionFeedbacks: (parsed.sectionFeedbacks ?? []).map((s: Record<string, unknown>) => ({
      section: typeof s.section === "string" ? s.section : "",
      comment: typeof s.comment === "string" ? s.comment : "",
      suggestions: Array.isArray(s.suggestions) ? s.suggestions.map(String) : [],
    })),
    deductions: (parsed.deductions ?? []).map((d: Record<string, unknown>) => ({
      reason: typeof d.reason === "string" ? d.reason : "",
      severity: isSeverity(d.severity) ? d.severity : "minor",
      suggestion: typeof d.suggestion === "string" ? d.suggestion : "",
    })),
    overallComment: String(parsed.overallComment ?? ""),
    improvementSuggestions: Array.isArray(parsed.improvementSuggestions)
      ? parsed.improvementSuggestions.map(String)
      : [],
  };
}

function toAiScoreSummary(result: EssayScoreResult): AiScoreSummary {
  const summary: AiScoreSummary = {
    total: result.totalScore,
    scoredAt: new Date().toISOString(),
  };
  for (const d of result.dimensions) {
    summary[d.name] = d.score;
  }
  return summary;
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

  // Rough cost estimate (per 1K tokens, in USD)
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

export interface EssayScoreStream {
  stream: AsyncIterable<string>;
  resultPromise: Promise<EssayScoreResult>;
}

export async function scoreEssay(userId: string, writingId: string): Promise<EssayScoreStream> {
  const writing = getWriting(userId, writingId);
  if (!writing) {
    throw new Error("论文不存在或无权访问");
  }

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

  const prompt = buildScoringPrompt(writing.title, writing.content);
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
  let resolveResult: (value: EssayScoreResult) => void;
  let rejectResult: (reason: Error) => void;
  const resultPromise = new Promise<EssayScoreResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  async function* streamGenerator(): AsyncGenerator<string> {
    try {
      for await (const chunk of textStream) {
        fullText += chunk;
        yield chunk;
      }

      const result = parseScoreResult(fullText);

      // Save score to database
      const db = getDb();
      const aiScoreJson = JSON.stringify(toAiScoreSummary(result));
      db.query(`UPDATE writings SET ai_score_json = ? WHERE id = ? AND user_id = ?`).run(
        aiScoreJson,
        writingId,
        userId,
      );

      // Record usage
      try {
        const u = await usage;
        recordAiUsage(
          userId,
          "essay_scoring",
          provider,
          model,
          u.inputTokens ?? 0,
          u.outputTokens ?? 0,
        );
      } catch {
        // Usage recording is best-effort
      }

      resolveResult(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === "TimeoutError") {
        rejectResult(new Error("AI_TIMEOUT"));
      } else {
        rejectResult(error);
      }
      throw error;
    }
  }

  return { stream: streamGenerator(), resultPromise };
}
