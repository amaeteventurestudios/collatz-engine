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
  updateAINoteStatus,
  getAIProviderEncryptedKey,
  getDraftById,
  getPublishingProfiles,
  logDraftEvent,
  createGeneratedImageRecord,
  saveObservatorySettings,
} from "@/lib/ai-observatory/admin-store";
import { checkDraftGuardrails } from "@/lib/ai-observatory/guardrails";
import type { ProviderName, ContentType, NoteType, NoteSeverity, DraftStatus, PublishingMode } from "@/lib/ai-observatory/types";
import { DEFAULT_DISCLOSURE_TEXT } from "@/lib/ai-observatory/types";

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
    excerpt: formData.get("excerpt") as string | null,
    tags: ((formData.get("tags") as string | null) ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    body_markdown: formData.get("body_markdown") as string | null,
    body_plain_text: formData.get("body_plain_text") as string | null,
    body_html: formData.get("body_html") as string | null,
    image_prompt: formData.get("image_prompt") as string | null,
    image_preset_id: formData.get("image_preset_id") as string | null,
    publishing_profile_id: formData.get("publishing_profile_id") as string | null,
    source_note_id: formData.get("source_note_id") as string | null,
    review_notes: formData.get("review_notes") as string | null,
    status: (formData.get("status") as DraftStatus) ?? "draft",
  };

  // Run guardrail check
  const guardrailResult = checkDraftGuardrails(draftData);
  const result = await upsertDraft(
    { ...draftData, guardrail_status: guardrailResult.summary },
    id ?? undefined,
  );
  if (result.ok && result.id) {
    await logDraftEvent(result.id, id ? "draft_updated" : "draft_created", id ? "Draft updated" : "Draft created");
  }

  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function createBlankDraftAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireSession();
  const title = ((formData.get("title") as string | null) ?? "Untitled Observatory Draft").trim();
  const contentType = ((formData.get("content_type") as ContentType | null) ?? "blog_post");
  const publishingProfileId = formData.get("publishing_profile_id") as string | null;
  const result = await upsertDraft({
    title,
    content_type: contentType,
    publishing_profile_id: publishingProfileId || null,
    status: "draft",
    guardrail_status: "Not checked yet.",
  });
  if (result.ok && result.id) await logDraftEvent(result.id, "draft_created", "Draft created manually");
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function approveDraftAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const draft = await getDraftById(id);
  if (!draft) return { ok: false, error: "Draft not found." };
  const guardrails = checkDraftGuardrails(draft);
  if (!guardrails.passed) return { ok: false, error: guardrails.summary };
  const profiles = await getPublishingProfiles();
  const profile = profiles.find((p) => p.id === draft.publishing_profile_id);
  if (profile?.requires_image && !draft.image_url) {
    return { ok: false, error: "This publishing profile requires an image before approval." };
  }
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
  const draft = await getDraftById(id);
  if (!draft) return { ok: false, error: "Draft not found." };
  if (draft.status !== "approved") return { ok: false, error: "Only approved drafts can be marked published/exported." };
  const result = await updateDraftStatus(id, "published", { published_at: new Date().toISOString() });
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function reopenDraftAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const result = await updateDraftStatus(id, "needs_review");
  revalidatePath("/admin/ai-observatory");
  return result;
}

export async function runGuardrailsAction(formData: FormData): Promise<{ ok: boolean; summary?: string; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  if (!id) return { ok: false, error: "Draft ID required." };
  const draft = await getDraftById(id);
  if (!draft) return { ok: false, error: "Draft not found." };
  const guardrails = checkDraftGuardrails(draft);
  const result = await upsertDraft({ guardrail_status: guardrails.summary }, id);
  await logDraftEvent(id, "guardrails_checked", "Guardrails checked", { passed: guardrails.passed, failedCount: guardrails.failedCount });
  revalidatePath("/admin/ai-observatory");
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true, summary: guardrails.summary };
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

export async function improveDraftAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string | null;
  const instruction = (formData.get("instruction") as string | null) ?? "Improve this draft while preserving verified source data and no-proof disclaimers.";
  const draft = id ? await getDraftById(id) : null;
  if (!draft) return { ok: false, error: "Select a draft before running AI improvement." };
  const providerName = (formData.get("provider_name") as ProviderName | null) ?? "anthropic";
  const modelName = (formData.get("model_name") as string | null) ?? "claude-opus-4-8";
  const encryptedKey = await getAIProviderEncryptedKey(providerName).catch(() => null);
  const result = await generateText({
    taskType: "drafts",
    prompt: [
      instruction,
      "Return only the revised markdown body.",
      "Do not claim the Collatz Conjecture is solved or proved.",
      `Title: ${draft.title}`,
      `Content type: ${draft.content_type}`,
      `Source data: ${JSON.stringify(draft.source_data ?? {})}`,
      `Current markdown:\n${draft.body_markdown ?? ""}`,
    ].join("\n\n"),
  }, encryptedKey ?? null, providerName, modelName);
  if (!result.ok || !result.text) return { ok: false, error: result.error ?? "No text generated." };
  const guardrails = checkDraftGuardrails({ ...draft, body_markdown: result.text, status: "needs_review" });
  const saved = await upsertDraft({
    body_markdown: result.text,
    body_plain_text: result.text.replace(/[#*_`>\-]/g, "").trim(),
    status: "needs_review",
    guardrail_status: guardrails.summary,
  }, draft.id);
  if (saved.ok) await logDraftEvent(draft.id, "text_generated", "Text generated or improved", { provider: result.provider, model: result.model });
  revalidatePath("/admin/ai-observatory");
  return saved;
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
  if (result.ok && result.imageUrl) {
    await createGeneratedImageRecord({
      draft_id: draftId,
      provider_name: "openai",
      model_name: result.model ?? "dall-e-3",
      prompt,
      image_url: result.imageUrl,
      width,
      height,
      target,
      status: "generated",
    });
    revalidatePath("/admin/ai-observatory");
  }
  return result;
}

export async function updateNoteStatusAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  if (!id || !status) return { ok: false, error: "Note ID and status are required." };
  const result = await updateAINoteStatus(id, status);
  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Content Radar ────────────────────────────────────────────────────────────

export async function createDraftFromTopicAction(formData: FormData): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireSession();

  const title = formData.get("title") as string | null;
  const contentType = (formData.get("content_type") as ContentType | null) ?? "blog_post";
  const sourceDataRaw = formData.get("source_data") as string | null;
  const publishingProfileId = formData.get("publishing_profile_id") as string | null;
  const publishingMode = (formData.get("publishing_mode") as PublishingMode | null) ?? "semi_auto";
  const disclosureText = (formData.get("disclosure_text") as string | null) ?? DEFAULT_DISCLOSURE_TEXT;

  if (!title?.trim()) return { ok: false, error: "Topic title is required." };

  let sourceData: Record<string, unknown> = {};
  try {
    if (sourceDataRaw) sourceData = JSON.parse(sourceDataRaw) as Record<string, unknown>;
  } catch { /* ignore malformed JSON */ }

  // Seed the draft body with the required disclosure so it is never missing.
  const bodyMarkdown =
    `# ${title.trim()}\n\n` +
    `*${disclosureText}*\n\n` +
    `<!-- Add your content here -->\n`;

  const initialStatus = publishingMode === "emergency_hold" ? "draft" : "draft";

  const result = await upsertDraft({
    title: title.trim(),
    content_type: contentType,
    source_data: sourceData,
    publishing_profile_id: publishingProfileId || null,
    status: initialStatus,
    body_markdown: bodyMarkdown,
    guardrail_status: "Not checked yet.",
  });

  if (result.ok && result.id) {
    await logDraftEvent(result.id, "draft_created", "Draft created from Content Radar", {
      source: "content_radar",
      publishing_mode: publishingMode,
    });
  }

  revalidatePath("/admin/ai-observatory");
  return result;
}

// ─── Observatory Settings ─────────────────────────────────────────────────────

export async function saveObservatorySettingsAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireSession();

  const mode = formData.get("publishing_mode") as PublishingMode | null;
  const disclosureText = formData.get("disclosure_text") as string | null;
  const maxPostsRaw = formData.get("max_auto_posts_per_day") as string | null;

  const updates: Record<string, unknown> = {};
  if (mode) updates.publishing_mode = mode;
  if (disclosureText?.trim()) updates.disclosure_text = disclosureText.trim();
  if (maxPostsRaw) {
    const parsed = parseInt(maxPostsRaw, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) updates.max_auto_posts_per_day = parsed;
  }

  const booleans: Array<[string, string]> = [
    ["auto_topic_detection_enabled", "auto_topic_detection_enabled"],
    ["auto_draft_generation_enabled", "auto_draft_generation_enabled"],
    ["auto_image_generation_enabled", "auto_image_generation_enabled"],
    ["auto_publish_enabled", "auto_publish_enabled"],
    ["weekly_report_enabled", "weekly_report_enabled"],
    ["record_trigger_enabled", "record_trigger_enabled"],
    ["near_escape_trigger_enabled", "near_escape_trigger_enabled"],
  ];
  for (const [field, key] of booleans) {
    const raw = formData.get(field);
    if (raw !== null) updates[key] = raw === "true";
  }

  if (Object.keys(updates).length === 0) return { ok: false, error: "No settings to save." };

  const result = await saveObservatorySettings(updates);
  revalidatePath("/admin/ai-observatory");
  return result;
}
