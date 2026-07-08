import { encrypt, decrypt } from "./crypto";
import { getDb } from "../db";
import type { AIConfig, Provider } from "@archprep/shared";

const DEFAULT_BASE_URLS: Record<Provider, string | undefined> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  minimax: "https://api.minimax.chat/v1",
  kimi: "https://api.moonshot.cn/v1",
  custom: undefined,
};

const DEFAULT_MODELS: Record<Provider, string | undefined> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-20241022",
  deepseek: "deepseek-chat",
  minimax: "MiniMax-Text-01",
  kimi: "moonshot-v1-8k",
  custom: undefined,
};

interface AIConfigInput {
  provider: Provider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface AIConfigRow {
  id: string;
  user_id: string;
  provider: string;
  api_key_encrypted: string;
  model: string | null;
  base_url: string | null;
  updated_at: string;
}

function toPublic(row: AIConfigRow): AIConfig {
  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider as Provider,
    model: row.model ?? undefined,
    baseUrl: row.base_url ?? undefined,
    updatedAt: row.updated_at,
  };
}

export function saveConfig(userId: string, input: AIConfigInput): AIConfig {
  const db = getDb();
  const id = crypto.randomUUID();
  const updatedAt = new Date().toISOString();
  const encryptedKey = encrypt(input.apiKey);
  const model = input.model?.trim() || DEFAULT_MODELS[input.provider] || null;
  const baseUrl = input.baseUrl?.trim() || DEFAULT_BASE_URLS[input.provider] || null;

  const row = db
    .query<AIConfigRow, [string, string, string, string, string | null, string | null, string]>(
      `
      INSERT INTO ai_configs (id, user_id, provider, api_key_encrypted, model, base_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        provider = excluded.provider,
        api_key_encrypted = excluded.api_key_encrypted,
        model = excluded.model,
        base_url = excluded.base_url,
        updated_at = excluded.updated_at
      RETURNING *
      `
    )
    .get(
      id,
      userId,
      input.provider,
      encryptedKey,
      model,
      baseUrl,
      updatedAt
    ) as AIConfigRow;

  return toPublic(row);
}

export function getConfig(userId: string): AIConfig | null {
  const db = getDb();
  const row = db
    .query<AIConfigRow, [string]>(
      "SELECT * FROM ai_configs WHERE user_id = ? LIMIT 1"
    )
    .get(userId);

  return row ? toPublic(row) : null;
}

export function getDecryptedKey(userId: string): string | null {
  const db = getDb();
  const row = db
    .query<{ api_key_encrypted: string }, [string]>(
      "SELECT api_key_encrypted FROM ai_configs WHERE user_id = ? LIMIT 1"
    )
    .get(userId);

  return row ? decrypt(row.api_key_encrypted) : null;
}

export async function testConnection(
  userId: string
): Promise<{ success: boolean; message: string }> {
  const db = getDb();
  const row = db
    .query<AIConfigRow, [string]>(
      "SELECT * FROM ai_configs WHERE user_id = ? LIMIT 1"
    )
    .get(userId);

  if (!row) {
    return { success: false, message: "AI 配置不存在" };
  }

  const apiKey = decrypt(row.api_key_encrypted);
  const provider = row.provider as Provider;
  const baseUrl = row.base_url || DEFAULT_BASE_URLS[provider];

  if (!baseUrl) {
    return { success: false, message: "未配置 base URL" };
  }

  try {
    const url = `${baseUrl}/models`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // 30s timeout for slow providers.
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        success: false,
        message: `连接失败: ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`,
      };
    }

    return { success: true, message: "连接成功" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message: `连接异常: ${message}` };
  }
}
