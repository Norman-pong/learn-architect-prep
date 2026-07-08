import { getDb } from "../../db";
import { sendVerificationCode } from "./email";
import jwt, { type JwtPayload as JsonWebTokenPayload } from "jsonwebtoken";
import { randomBytes } from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const ACCESS_EXPIRES_IN = "7d";
const REFRESH_EXPIRES_IN_SECONDS = 30 * 24 * 60 * 60;
const CODE_COOLDOWN_SECONDS = 60;
const CODE_VALID_SECONDS = 5 * 60;

export interface JwtPayload {
  userId: string;
  email: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface AuthResult<T = unknown> {
  ok: boolean;
  error?: string;
  status?: number;
}

export interface AuthSuccess<T> extends AuthResult<T> {
  ok: true;
  data: T;
}

export interface AuthFailure extends AuthResult<never> {
  ok: false;
  error: string;
  status: number;
}

export type AuthOutcome<T> = AuthSuccess<T> | AuthFailure;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function assertSecret(): void {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
}

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function addSecondsIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function generateAccessToken(payload: JwtPayload): string {
  assertSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export async function sendCode(email: string): Promise<AuthOutcome<void>> {
  const db = getDb();
  const existing = db
    .query<{ codeExpiresAt: string | null }, [string]>(
      "SELECT code_expires_at AS codeExpiresAt FROM users WHERE email = ?;",
    )
    .get(email);

  const now = new Date();
  if (existing?.codeExpiresAt) {
    const expiresAt = new Date(existing.codeExpiresAt);
    const cooldownEnd = new Date(
      expiresAt.getTime() - (CODE_VALID_SECONDS - CODE_COOLDOWN_SECONDS) * 1000,
    );
    if (now < cooldownEnd) {
      return { ok: false, error: "请 60 秒后再试", status: 429 };
    }
  }

  const code = generateCode();
  const expiresAt = addSecondsIso(CODE_VALID_SECONDS);

  db.run(
    `INSERT INTO users (id, email, verify_code, code_expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       verify_code = excluded.verify_code,
       code_expires_at = excluded.code_expires_at;`,
    [crypto.randomUUID(), email, code, expiresAt, nowIso()],
  );

  await sendVerificationCode(email, code);
  return { ok: true, data: undefined };
}

export async function verifyCode(email: string, code: string): Promise<AuthOutcome<TokenPair>> {
  const db = getDb();
  const row = db
    .query<{ id: string; verifyCode: string | null; codeExpiresAt: string | null }, [string]>(
      "SELECT id, verify_code AS verifyCode, code_expires_at AS codeExpiresAt FROM users WHERE email = ?;",
    )
    .get(email);

  if (!row) {
    return { ok: false, error: "验证码错误", status: 400 };
  }

  const expiresAt = row.codeExpiresAt ? new Date(row.codeExpiresAt) : null;
  if (!expiresAt || new Date() > expiresAt) {
    return { ok: false, error: "验证码已过期，请重新获取", status: 400 };
  }

  if (row.verifyCode !== code) {
    return { ok: false, error: "验证码错误", status: 400 };
  }

  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = addSecondsIso(REFRESH_EXPIRES_IN_SECONDS);

  db.run(
    `UPDATE users
     SET verify_code = NULL,
         code_expires_at = NULL,
         refresh_token = ?,
         refresh_expires_at = ?
     WHERE id = ?;`,
    [refreshToken, refreshExpiresAt, row.id],
  );

  const accessToken = generateAccessToken({ userId: row.id, email });
  return { ok: true, data: { accessToken, refreshToken } };
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AuthOutcome<{ accessToken: string }>> {
  const db = getDb();
  const row = db
    .query<{ id: string; email: string; refreshExpiresAt: string | null }, [string]>(
      "SELECT id, email, refresh_expires_at AS refreshExpiresAt FROM users WHERE refresh_token = ?;",
    )
    .get(refreshToken);

  if (!row) {
    return { ok: false, error: "Invalid refresh token", status: 401 };
  }

  const expiresAt = row.refreshExpiresAt ? new Date(row.refreshExpiresAt) : null;
  if (!expiresAt || new Date() > expiresAt) {
    return { ok: false, error: "Refresh token expired", status: 401 };
  }

  const accessToken = generateAccessToken({ userId: row.id, email: row.email });
  return { ok: true, data: { accessToken } };
}

function isJwtPayload(value: unknown): value is JsonWebTokenPayload & JwtPayload {
  if (typeof value !== "object" || value === null) return false;
  if (Array.isArray(value)) return false;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const v = value as Record<string, unknown>;
  return typeof v.userId === "string" && typeof v.email === "string";
}

export async function getUserIdFromToken(
  authorization: string | undefined,
): Promise<string | null> {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return null;
  }

  try {
    assertSecret();
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isJwtPayload(decoded)) {
      return null;
    }
    return decoded.userId ?? null;
  } catch {
    return null;
  }
}

export async function getUserById(userId: string): Promise<{ id: string; email: string } | null> {
  const db = getDb();
  const row = db
    .query<{ id: string; email: string }, [string]>("SELECT id, email FROM users WHERE id = ?;")
    .get(userId);
  return row ?? null;
}
