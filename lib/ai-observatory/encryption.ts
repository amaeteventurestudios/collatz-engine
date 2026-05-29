import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";

function getKey(): Buffer | null {
  const raw = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) return null;
  return Buffer.from(raw.slice(0, 64), "hex").subarray(0, 32);
}

export function isEncryptionConfigured(): boolean {
  const raw = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!raw) return false;
  // Accept a 64-char hex string (= 32 bytes) or a ≥32-char raw string
  return raw.length >= 32;
}

export function encryptApiKey(plaintext: string): string | null {
  const key = getKey();
  if (!key) return null;
  try {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALG, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    // Format: iv(24 hex) + tag(32 hex) + encrypted(hex)
    return iv.toString("hex") + tag.toString("hex") + encrypted.toString("hex");
  } catch {
    return null;
  }
}

export function decryptApiKey(ciphertext: string): string | null {
  const key = getKey();
  if (!key) return null;
  try {
    const iv = Buffer.from(ciphertext.slice(0, 24), "hex");
    const tag = Buffer.from(ciphertext.slice(24, 56), "hex");
    const data = Buffer.from(ciphertext.slice(56), "hex");
    const decipher = createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data) + decipher.final("utf8");
  } catch {
    return null;
  }
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return "***";
  const prefix = key.slice(0, Math.min(8, key.indexOf("-") + 1) || 4);
  const suffix = key.slice(-4);
  return `${prefix}...${suffix}`;
}
