import { streamText, type ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDeepSeek } from "@ai-sdk/deepseek";
import path from "node:path";
import { getDb } from "../../db";
import { getConfig, getDecryptedKey } from "./ai-config-service";
import type { Provider } from "@archprep/shared";
import { DATA_DIR } from "../../config/paths";

const KNOWLEDGE_DIR = path.join(DATA_DIR, "knowledge");

function chapterDirName(chapterId: string): string {
  const safe = path.basename(chapterId);
  if (safe.startsWith("chapter-")) return safe;
  const num = safe.replace(/^ch/, "");
  return `chapter-${num.padStart(2, "0")}`;
}

async function loadKnowledgeContent(
  chapterId: string,
  kpId: string,
): Promise<{ title: string; content: string; chapterTitle: string } | null> {
  const dir = chapterDirName(chapterId);
  const indexFile = Bun.file(path.join(KNOWLEDGE_DIR, dir, "index.json"));
  if (!(await indexFile.exists())) return null;

  let index: { title?: string; knowledgePoints: { id: string; title: string; file: string }[] };
  try {
    index = JSON.parse(await indexFile.text());
  } catch {
    return null;
  }

  const kp = index.knowledgePoints.find((item) => item.id === kpId);
  if (!kp) return null;

  const file = Bun.file(path.join(KNOWLEDGE_DIR, dir, path.basename(kp.file)));
  if (!(await file.exists())) return null;

  const content = await file.text();
  return { title: kp.title, content, chapterTitle: index.title ?? dir };
}

function createProviderInstance(provider: Provider, apiKey: string, baseUrl?: string) {
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

function buildQaPrompt(
  knowledgeTitle: string,
  chapterTitle: string,
  knowledgeContent: string,
  question: string,
  history?: { role: "user" | "assistant"; content: string }[],
): ModelMessage[] {
  const systemContent = `你是一位系统架构设计师备考辅导专家。请基于以下教材知识点回答用户问题。

## 回答要求
1. 严格基于提供的知识点内容作答，不要超纲或引入教材外的内容
2. 回答要简洁清晰，适合备考复习
3. 如涉及概念对比，使用表格或列表形式呈现
4. 在回答末尾标注引用来源章节

## 当前知识点
章节：${chapterTitle}
知识点：${knowledgeTitle}

## 知识点原文
${knowledgeContent}`;

  const messages: ModelMessage[] = [{ role: "system", content: systemContent }];

  if (history && history.length > 0) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.content });
    }
  }

  messages.push({ role: "user", content: question });
  return messages;
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

export interface QAStreamResult {
  stream: AsyncIterable<string>;
  usage: PromiseLike<{ inputTokens?: number; outputTokens?: number }>;
}

export async function answerQuestion(
  userId: string,
  chapterId: string,
  knowledgePointId: string,
  question: string,
  history?: { role: "user" | "assistant"; content: string }[],
): Promise<QAStreamResult> {
  const config = getConfig(userId);
  if (!config) {
    throw new Error("AI_CONFIG_MISSING");
  }

  const apiKey = getDecryptedKey(userId);
  if (!apiKey) {
    throw new Error("AI_KEY_MISSING");
  }

  const knowledge = await loadKnowledgeContent(chapterId, knowledgePointId);
  if (!knowledge) {
    throw new Error("KNOWLEDGE_NOT_FOUND");
  }

  const provider = config.provider;
  const model = config.model ?? "gpt-4o-mini";
  const baseUrl = config.baseUrl;

  const aiProvider = createProviderInstance(provider, apiKey, baseUrl);
  const messages = buildQaPrompt(
    knowledge.title,
    knowledge.chapterTitle,
    knowledge.content,
    question,
    history,
  );

  const { textStream, usage } = streamText({
    model: aiProvider(model),
    messages,
    maxOutputTokens: 2000,
    abortSignal: AbortSignal.timeout(30000),
  });

  // Record usage after the stream completes (best-effort)
  Promise.resolve(usage)
    .then((u) => {
      try {
        recordAiUsage(userId, "qa", provider, model, u.inputTokens ?? 0, u.outputTokens ?? 0);
      } catch {
        // best-effort
      }
    })
    .catch(() => {
      // ignore usage recording failures
    });

  return { stream: textStream, usage };
}
