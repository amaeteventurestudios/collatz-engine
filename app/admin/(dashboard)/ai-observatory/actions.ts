"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/admin/auth";
import { encryptApiKey, maskApiKey, isEncryptionConfigured } from "@/lib/ai-observatory/encryption";
import { testProviderConnection, generateText, generateImage } from "@/lib/ai-observatory/providers";
import {
  upsertAIProvider,
  updateProviderTestResult,
  upsertModelSetting,
  upsertBrandVoiceProfile,
  upsertPromptTemplate,
  upsertDraft,
  updateDraftStatus,
  createAINote,
  getAIProviderEncryptedKey,
} from "@/lib/ai-observatory/admin-store";
import { checkDraftGuardrails } from "@/lib/ai-observatory/guardrails";
import type { ProviderName, ContentType, NoteType, NoteSeverity, DraftStatus } from "@/lib/ai-observatory/types";

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) {
    redirect("/admin/login");
  }
}

// ─── Provider actions ─────────────────────────────────────────────────────────

export async function saveProviderKeyAction(formData: FormData): Promise<{ ok: boolean; error?: string; masked?: string }> {
  await requireSession();

  const providerName = formData.get("provider_name") as ProviderName;
  const rawKey = formData.get("api_key") as string | null;
  const displayName = formData.get("display_name") as string | null;
  const enabled = formData.get("enabled") === "true";

  if (!providerName) return { ok: false, error: "Provider name is required." };
  if (!rawKey?.trim()) return { ok: false, error: "API key is required." };

  if (!isEncryptionConfigured()) {
    return {
      ok: false,
      error: "Encryption key not configured. Set AI_SETTINGS_ENCRYPTION_KEY (64-char hex) before storing provider keys.",
    };
  }

  const encrypted = encryptApiKey(rawKey.trim());
  if (!encrypted) return { ok: false, error: "Failed to encrypt API key. Check AI_SETTINGS_ENCRYPTION_KEY." };

  const masked = maskApiKey(rawKey.trim());

  const result = await upsertAIProvider(providerName, {
    display_name: displayName ?? providerName,
    enabled,
    api_key_encrypted: encrypted,
    api_key_masked: masked,
    last_test_status: "untested",
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/admin/ai-observatory");
  return { ok: true, masked };
}

export async function deleteProviderKeyAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const providerName = formData.get("provider_name") as ProviderName;
  if (!providerName) return { ok: false, error: "Provider name required." };

  const result = await upsertAIProvider(providerName, {
    api_key_encrypted: null as unknown as string,
    api_key_masked: null,
    enabled: false,
    last_test_status: "untested",
    last_test_message: null,
  });

  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function testProviderAction(formData: FormData): Promise<{ ok: boolean; message: string }> {
  await requireSession();
  const providerName = formData.get("provider_name") as ProviderName;
  if (!providerName) return { ok: false, message: "Provider name required." };

  const encryptedKey = await getAIProviderEncryptedKey(providerName).catch(() => null);
  const result = await testProviderConnection(providerName, encryptedKey ?? null);

  await updateProviderTestResult(providerName, result.ok, result.message);
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function toggleProviderAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const providerName = formData.get("provider_name") as ProviderName;
  const enabled = formData.get("enabled") === "true";
  if (!providerName) return { ok: false, error: "Provider name required." };
  const result = await upsertAIProvider(providerName, { enabled });
  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Model settings ───────────────────────────────────────────────────────────

export async function saveModelSettingAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const taskType = formData.get("task_type") as string;
  if (!taskType) return { ok: false, error: "Task type required." };

  const result = await upsertModelSetting(taskType, {
    provider_name: formData.get("provider_name") as ProviderName,
    model_name: formData.get("model_name") as string,
    enabled: formData.get("enabled") !== "false",
    temperature: parseFloat(formData.get("temperature") as string) || 0.5,
    max_tokens: parseInt(formData.get("max_tokens") as string) || 2048,
  });

  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Brand voice ──────────────────────────────────────────────────────────────

export async function saveBrandVoiceAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string | null;
  const result = await upsertBrandVoiceProfile({
    name: formData.get("name") as string,
    voice_summary: formData.get("voice_summary") as string,
    long_form_instructions: formData.get("long_form_instructions") as string,
    social_instructions: formData.get("social_instructions") as string,
    image_style_instructions: formData.get("image_style_instructions") as string,
    preferred_phrases: (formData.get("preferred_phrases") as string ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    phrases_to_avoid: (formData.get("phrases_to_avoid") as string ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    formatting_rules: formData.get("formatting_rules") as string,
    good_examples: formData.get("good_examples") as string,
    bad_examples: formData.get("bad_examples") as string,
  }, id ?? undefined);

  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Prompt templates ─────────────────────────────────────────────────────────

export async function savePromptTemplateAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string | null;
  const result = await upsertPromptTemplate({
    template_type: formData.get("template_type") as string as import("@/lib/ai-observatory/types").TemplateType,
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    template_body: formData.get("template_body") as string,
    required_variables: (formData.get("required_variables") as string ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    enabled: formData.get("enabled") !== "false",
  }, id ?? undefined);

  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function createNoteAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireSession();
  const result = await createAINote({
    title: formData.get("title") as string,
    note_type: (formData.get("note_type") as NoteType) ?? "system",
    body: formData.get("body") as string,
    source_event_type: formData.get("source_event_type") as string | null,
    source_data: null,
    severity: (formData.get("severity") as NoteSeverity) ?? "info",
    status: "new",
  });

  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Drafts ───────────────────────────────────────────────────────────────────

export async function saveDraftAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string | null;

  const draftData = {
    title: formData.get("title") as string,
    content_type: formData.get("content_type") as ContentType,
    body_markdown: formData.get("body_markdown") as string | null,
    body_plain_text: formData.get("body_plain_text") as string | null,
    image_prompt: formData.get("image_prompt") as string | null,
    publishing_profile_id: formData.get("publishing_profile_id") as string | null,
    source_note_id: formData.get("source_note_id") as string | null,
    status: (formData.get("status") as DraftStatus) ?? "draft",
  };

  // Run guardrail check
  const guardrailResult = checkDraftGuardrails(draftData);
  const result = await upsertDraft(
    { ...draftData, guardrail_status: guardrailResult.summary },
    id ?? undefined,
  );

  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function approveDraftAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const result = await updateDraftStatus(id, "approved", { approved_at: new Date().toISOString() });
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function rejectDraftAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  const notes = formData.get("review_notes") as string | null;
  if (!id) return { ok: false, error: "Draft ID required." };
  const result = await updateDraftStatus(id, "rejected", { review_notes: notes ?? undefined });
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function archiveDraftAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const result = await updateDraftStatus(id, "archived");
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function markPublishedAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const result = await updateDraftStatus(id, "published", { published_at: new Date().toISOString() });
  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Generation ───────────────────────────────────────────────────────────────

export async function generateTextAction(formData: FormData): Promise<{ ok: boolean; text?: string; error?: string }> {
  await requireSession();

  const providerName = (formData.get("provider_name") as ProviderName) ?? "anthropic";
  const taskType = formData.get("task_type") as import("@/lib/ai-observatory/types").TaskType ?? "drafts";
  const prompt = formData.get("prompt") as string;
  const modelName = formData.get("model_name") as string ?? "claude-opus-4-8";

  if (!prompt) return { ok: false, error: "Prompt is required." };

  const encryptedKey = await getAIProviderEncryptedKey(providerName).catch(() => null);
  const result = await generateText({ taskType, prompt }, encryptedKey ?? null, providerName, modelName);
  return result;
}

export async function generateImageAction(formData: FormData): Promise<{ ok: boolean; imageUrl?: string; error?: string }> {
  await requireSession();

  const prompt = formData.get("prompt") as string;
  const width = parseInt(formData.get("width") as string) || 1792;
  const height = parseInt(formData.get("height") as string) || 1024;
  const target = formData.get("target") as import("@/lib/ai-observatory/types").ImageTarget ?? "blog";
  const draftId = formData.get("draft_id") as string | null;

  if (!prompt) return { ok: false, error: "Image prompt is required." };

  const encryptedKey = await getAIProviderEncryptedKey("openai").catch(() => null);
  const result = await generateImage({ prompt, width, height, target, draftId: draftId ?? undefined }, encryptedKey ?? null);
  return result;
}
