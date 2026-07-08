import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Derive a 32-byte AES key from AI_ENCRYPT_KEY.
 * Accepts either 32 raw bytes or a hex/base64 encoded string.
 */
function getKey(): Buffer {
  const raw = process.env.AI_ENCRYPT_KEY;
  if (!raw) {
    throw new Error("AI_ENCRYPT_KEY environment variable is not set");
  }

  // 32 raw bytes (non-hex printable chars) is discouraged but accepted.
  if (Buffer.byteLength(raw, "utf8") === 32) {
    return Buffer.from(raw, "utf8");
  }

  // Hex: 64 characters.
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  // Base64.
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length === 32) {
    return decoded;
  }

  throw new Error(
    "AI_ENCRYPT_KEY must be 32 raw bytes, 64 hex characters, or 32 bytes base64 encoded",
  );
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64(iv || ciphertext || tag).
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, encrypted, tag]);

  // Zero out the local key copy from the Buffer (best effort).
  key.fill(0);

  return combined.toString("base64");
}

/**
 * Decrypt a payload produced by encrypt().
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const combined = Buffer.from(ciphertext, "base64");

  if (combined.length < 29) {
    key.fill(0);
    throw new Error("Invalid encrypted payload: too short");
  }

  const iv = combined.subarray(0, 12);
  const tag = combined.subarray(combined.length - 16);
  const encrypted = combined.subarray(12, combined.length - 16);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  try {
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    key.fill(0);
    return plaintext.toString("utf8");
  } catch (err) {
    key.fill(0);
    throw new Error("Decryption failed: authentication tag mismatch or corrupted data", {
      cause: err,
    });
  }
}
