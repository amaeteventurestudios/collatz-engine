import "server-only";
import type {
  ProviderName,
  GenerateTextInput,
  GenerateTextResult,
  GenerateImageInput,
  GenerateImageResult,
} from "./types";
import { decryptApiKey } from "./encryption";

// ─── Provider capability check ────────────────────────────────────────────────

export function getProviderApiKey(encryptedKey: string | null): string | null {
  if (!encryptedKey) return null;
  return decryptApiKey(encryptedKey);
}

export function getEnvFallbackKey(provider: ProviderName): string | null {
  switch (provider) {
    case "openai":     return process.env.OPENAI_API_KEY ?? null;
    case "anthropic":  return process.env.ANTHROPIC_API_KEY ?? null;
    case "openrouter": return process.env.OPENROUTER_API_KEY ?? null;
    case "gemini":     return process.env.GEMINI_API_KEY ?? null;
    default:           return null;
  }
}

// ─── Text generation ──────────────────────────────────────────────────────────

export async function generateText(
  input: GenerateTextInput,
  encryptedKey: string | null,
  provider: ProviderName,
  modelName: string,
): Promise<GenerateTextResult> {
  const key = getProviderApiKey(encryptedKey) ?? getEnvFallbackKey(provider);

  if (!key) {
    return { ok: false, error: `Provider ${provider} is not configured. Add an API key in AI Studio → Providers.` };
  }

  // OpenAI text via fetch (no SDK required)
  if (provider === "openai") {
    return generateOpenAIText(key, modelName, input);
  }

  // Anthropic text via fetch
  if (provider === "anthropic") {
    return generateAnthropicText(key, modelName, input);
  }

  return { ok: false, error: `Provider ${provider} text generation is not yet implemented.` };
}

async function generateOpenAIText(
  key: string,
  model: string,
  input: GenerateTextInput,
): Promise<GenerateTextResult> {
  try {
    const body = {
      model,
      messages: [
        ...(input.systemPrompt ? [{ role: "system", content: input.systemPrompt }] : []),
        { role: "user", content: input.prompt },
      ],
      max_tokens: 4096,
      temperature: 0.5,
    };

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      return { ok: false, error: (err as { error?: { message?: string } })?.error?.message ?? `OpenAI error ${res.status}` };
    }

    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return {
      ok: true, text, provider: "openai", model,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "OpenAI request failed." };
  }
}

async function generateAnthropicText(
  key: string,
  model: string,
  input: GenerateTextInput,
): Promise<GenerateTextResult> {
  try {
    const body = {
      model,
      max_tokens: 4096,
      ...(input.systemPrompt ? { system: input.systemPrompt } : {}),
      messages: [{ role: "user", content: input.prompt }],
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      return { ok: false, error: (err as { error?: { message?: string } })?.error?.message ?? `Anthropic error ${res.status}` };
    }

    const data = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    return {
      ok: true, text, provider: "anthropic", model,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Anthropic request failed." };
  }
}

// ─── Image generation ─────────────────────────────────────────────────────────

export async function generateImage(
  input: GenerateImageInput,
  encryptedKey: string | null,
): Promise<GenerateImageResult> {
  const key = getProviderApiKey(encryptedKey) ?? getEnvFallbackKey("openai");

  if (!key) {
    return { ok: false, error: "OpenAI API key not configured. Add it in AI Studio → Providers." };
  }

  // Map width/height to DALL-E 3 supported sizes
  const size = mapToDalleSize(input.width, input.height);

  try {
    const body = {
      model: "dall-e-3",
      prompt: input.prompt,
      n: 1,
      size,
      quality: "hd",
      style: "vivid",
    };

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      return { ok: false, error: (err as { error?: { message?: string } })?.error?.message ?? `OpenAI image error ${res.status}` };
    }

    const data = await res.json() as { data: Array<{ url: string }> };
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) return { ok: false, error: "No image URL returned from OpenAI." };

    return { ok: true, imageUrl, provider: "openai", model: "dall-e-3" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Image generation failed." };
  }
}

function mapToDalleSize(w: number, h: number): "1024x1024" | "1792x1024" | "1024x1792" {
  if (w > h) return "1792x1024";
  if (h > w) return "1024x1792";
  return "1024x1024";
}

// ─── Connection test ───────────────────────────────────────────────────────────

export async function testProviderConnection(
  provider: ProviderName,
  encryptedKey: string | null,
): Promise<{ ok: boolean; message: string }> {
  const key = getProviderApiKey(encryptedKey) ?? getEnvFallbackKey(provider);
  if (!key) return { ok: false, message: "No API key configured." };

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return res.ok
        ? { ok: true, message: "Connected to OpenAI." }
        : { ok: false, message: `OpenAI returned ${res.status}.` };
    }

    if (provider === "anthropic") {
      // Anthropic: small test message
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return res.ok
        ? { ok: true, message: "Connected to Anthropic." }
        : { ok: false, message: `Anthropic returned ${res.status}.` };
    }

    return { ok: false, message: `Provider ${provider} connection test not implemented.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Connection failed." };
  }
}
