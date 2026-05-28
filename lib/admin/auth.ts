export const SESSION_COOKIE = "__admin_sess";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours

function base64urlEncode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function getSecret(): string {
  const u = process.env.ADMIN_USERNAME ?? "";
  const p = process.env.ADMIN_PASSWORD ?? "";
  if (!u || !p) throw new Error("Admin credentials not configured");
  // Combine both so changing either invalidates existing sessions
  return `${u}:${p}:collatz-admin-session`;
}

export async function createSessionToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: "admin", iat: now, exp: now + SESSION_MAX_AGE };
  const enc = new TextEncoder();
  const payloadB64 = base64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await getKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = base64urlEncode(new Uint8Array(sig));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    const enc = new TextEncoder();
    const key = await getKey(getSecret());
    const sigBytes = base64urlDecode(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      enc.encode(payloadB64).buffer as ArrayBuffer,
    );
    if (!valid) return false;
    const payloadBytes = base64urlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    const now = Math.floor(Date.now() / 1000);
    return payload.sub === "admin" && payload.exp > now;
  } catch {
    return false;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  // Constant-time compare to prevent timing attacks
  const enc = new TextEncoder();
  const uMatch = safeEqual(enc.encode(username), enc.encode(expectedUser));
  const pMatch = safeEqual(enc.encode(password), enc.encode(expectedPass));
  return uMatch && pMatch;
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    // Still iterate to keep timing consistent
    let diff = 0;
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
    }
    return diff === 0 && a.length === b.length;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
