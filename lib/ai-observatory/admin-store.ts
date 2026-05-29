import "server-only";
import { createClient } from "@supabase/supabase-js";
import type {
  AIProvider,
  AIModelSetting,
  AIBrandVoiceProfile,
  AIPromptTemplate,
  AIImagePreset,
  AIPublishingProfile,
  AINoteRow,
  AIDraftRow,
  AIDraftAuditEvent,
  AIGeneratedImage,
  AIObservatoryStats,
  ProviderName,
  DraftStatus,
} from "./types";

// ─── Supabase client ──────────────────────────────────────────────────────────

// Admin store always uses the service role key — never the anon key.
// The anon key cannot write to ai_providers (no grants, protected by RLS).
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function serviceRoleError(): { ok: false; error: string } {
  return {
    ok: false,
    error:
      "Supabase service role key not configured. " +
      "Set SUPABASE_SERVICE_ROLE_KEY in your environment before saving provider keys.",
  };
}

function classifyDbError(err: unknown): string {
  const msg = String((err as { message?: string })?.message ?? err);
  if (msg.includes("permission denied")) {
    return (
      "Permission denied for AI Observatory tables. " +
      "Run supabase/phase-3c-ai-provider-permissions.sql and ensure " +
      "SUPABASE_SERVICE_ROLE_KEY is set correctly."
    );
  }
  if (isMissingTable(err)) {
    return (
      "AI Observatory tables not found. " +
      "Run supabase/phase-3a-ai-observatory.sql first."
    );
  }
  return msg || "Unknown database error.";
}

// ─── Graceful table-missing helper ────────────────────────────────────────────

function isMissingTable(err: unknown): boolean {
  if (!err) return false;
  const msg = String((err as { message?: string })?.message ?? err);
  return msg.includes("does not exist") || msg.includes("relation") || msg.includes("42P01");
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getAIObservatoryStats(): Promise<AIObservatoryStats> {
  const client = getClient();
  const zero: AIObservatoryStats = {
    notesCount: 0, draftsCount: 0, needsReviewCount: 0, approvedCount: 0,
    publishedCount: 0, rejectedCount: 0, reportsGenerated: 0, imagesGenerated: 0,
  };
  if (!client) return zero;

  try {
    const [notesRes, draftsRes, imagesRes] = await Promise.all([
      client.from("ai_notes").select("id", { count: "exact", head: true }),
      client.from("ai_drafts").select("status"),
      client.from("ai_generated_images").select("id", { count: "exact", head: true }),
    ]);

    if (isMissingTable(notesRes.error) || isMissingTable(draftsRes.error)) return zero;

    const drafts = (draftsRes.data ?? []) as { status: string }[];
    return {
      notesCount: notesRes.count ?? 0,
      draftsCount: drafts.length,
      needsReviewCount: drafts.filter((d) => d.status === "needs_review" || d.status === "draft").length,
      approvedCount: drafts.filter((d) => d.status === "approved").length,
      publishedCount: drafts.filter((d) => d.status === "published").length,
      rejectedCount: drafts.filter((d) => d.status === "rejected" || d.status === "archived").length,
      reportsGenerated: drafts.filter((d) => ["needs_review","approved","published"].includes(d.status)).length,
      imagesGenerated: imagesRes.count ?? 0,
    };
  } catch {
    return zero;
  }
}

// ─── Providers ────────────────────────────────────────────────────────────────

export async function getAIProviders(): Promise<AIProvider[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_providers").select("*").order("provider_name");
    if (error || !data) return [];
    return (data as AIProvider[]).map((p) => ({ ...p, api_key_encrypted: undefined as unknown as string }));
  } catch { return []; }
}

export async function getAIProviderEncryptedKey(providerId: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from("ai_providers")
      .select("api_key_encrypted")
      .eq("provider_name", providerId)
      .maybeSingle();
    if (error || !data) return null;
    return (data as { api_key_encrypted: string | null }).api_key_encrypted;
  } catch { return null; }
}

export async function getAISetupState(): Promise<{ tablesReady: boolean }> {
  const client = getClient();
  if (!client) return { tablesReady: false };
  try {
    const { error } = await client.from("ai_drafts").select("id", { head: true, count: "exact" }).limit(1);
    return { tablesReady: !error };
  } catch {
    return { tablesReady: false };
  }
}

export async function upsertAIProvider(
  providerName: ProviderName,
  updates: Partial<Omit<AIProvider, "id" | "created_at"> & { api_key_encrypted?: string }>,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { error } = await client.from("ai_providers").upsert({
      provider_name: providerName,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider_name" });
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

export async function updateProviderTestResult(
  providerName: ProviderName,
  ok: boolean,
  message: string,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.from("ai_providers").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: ok ? "ok" : "error",
      last_test_message: message,
      updated_at: new Date().toISOString(),
    }).eq("provider_name", providerName);
  } catch { /* ignore */ }
}

// ─── Model Settings ───────────────────────────────────────────────────────────

export async function getModelSettings(): Promise<AIModelSetting[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_model_settings").select("*").order("task_type");
    if (error || !data) return [];
    return data as AIModelSetting[];
  } catch { return []; }
}

export async function upsertModelSetting(
  taskType: string,
  updates: Partial<Omit<AIModelSetting, "id" | "created_at">>,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { error } = await client.from("ai_model_settings").upsert({
      task_type: taskType,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: "task_type" });
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

// ─── Brand Voice ──────────────────────────────────────────────────────────────

export async function getBrandVoiceProfiles(): Promise<AIBrandVoiceProfile[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_brand_voice_profiles").select("*").order("is_default", { ascending: false });
    if (error || !data) return [];
    return data as AIBrandVoiceProfile[];
  } catch { return []; }
}

export async function upsertBrandVoiceProfile(
  profileData: Partial<Omit<AIBrandVoiceProfile, "id" | "created_at">>,
  id?: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const payload = { ...profileData, updated_at: new Date().toISOString() };
    const { data, error } = id
      ? await client.from("ai_brand_voice_profiles").update(payload).eq("id", id).select("id").maybeSingle()
      : await client.from("ai_brand_voice_profiles").insert(payload).select("id").maybeSingle();
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true, id: (data as { id: string } | null)?.id };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export async function getPromptTemplates(): Promise<AIPromptTemplate[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_prompt_templates").select("*").order("template_type");
    if (error || !data) return [];
    return data as AIPromptTemplate[];
  } catch { return []; }
}

export async function upsertPromptTemplate(
  templateData: Partial<Omit<AIPromptTemplate, "id" | "created_at">>,
  id?: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const payload = { ...templateData, updated_at: new Date().toISOString() };
    const { error } = id
      ? await client.from("ai_prompt_templates").update(payload).eq("id", id)
      : await client.from("ai_prompt_templates").insert(payload);
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

// ─── Image Presets ────────────────────────────────────────────────────────────

export async function getImagePresets(): Promise<AIImagePreset[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_image_presets").select("*").order("target");
    if (error || !data) return [];
    return data as AIImagePreset[];
  } catch { return []; }
}

// ─── Publishing Profiles ──────────────────────────────────────────────────────

export async function getPublishingProfiles(): Promise<AIPublishingProfile[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from("ai_publishing_profiles").select("*").order("name");
    if (error || !data) return [];
    return data as AIPublishingProfile[];
  } catch { return []; }
}

// ─── AI Notes ─────────────────────────────────────────────────────────────────

export async function getRecentAINotes(limit = 10): Promise<AINoteRow[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("ai_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || isMissingTable(error)) return [];
    return (data ?? []) as AINoteRow[];
  } catch { return []; }
}

export async function getAINotes(limit = 50): Promise<AINoteRow[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("ai_notes")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || isMissingTable(error)) return [];
    return (data ?? []) as AINoteRow[];
  } catch { return []; }
}

export async function createAINote(
  noteData: Omit<AINoteRow, "id" | "created_at" | "updated_at">,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { data, error } = await client
      .from("ai_notes")
      .insert({ ...noteData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true, id: (data as { id: string } | null)?.id };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

export async function updateAINoteStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { error } = await client.from("ai_notes").update({
      status,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

// ─── AI Drafts ────────────────────────────────────────────────────────────────

export async function getRecentDrafts(limit = 20, statusFilter?: string[]): Promise<AIDraftRow[]> {
  const client = getClient();
  if (!client) return [];
  try {
    let query = client.from("ai_drafts").select("*").order("updated_at", { ascending: false }).limit(limit);
    if (statusFilter && statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }
    const { data, error } = await query;
    if (error || isMissingTable(error)) return [];
    return (data ?? []) as AIDraftRow[];
  } catch { return []; }
}

export async function getAllDrafts(limit = 100): Promise<AIDraftRow[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("ai_drafts")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(limit);
    if (error || isMissingTable(error)) return [];
    return (data ?? []) as AIDraftRow[];
  } catch { return []; }
}

export async function getDraftById(id: string): Promise<AIDraftRow | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from("ai_drafts").select("*").eq("id", id).maybeSingle();
    if (error || !data) return null;
    return data as AIDraftRow;
  } catch { return null; }
}

export async function upsertDraft(
  draftData: Partial<Omit<AIDraftRow, "id" | "created_at">>,
  id?: string,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const payload = { ...draftData, updated_at: new Date().toISOString() };
    const { data, error } = id
      ? await client.from("ai_drafts").update(payload).eq("id", id).select("id").maybeSingle()
      : await client.from("ai_drafts").insert({ ...payload, created_at: new Date().toISOString() }).select("id").maybeSingle();
    if (error) return { ok: false, error: classifyDbError(error) };
    return { ok: true, id: (data as { id: string } | null)?.id };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

export async function logDraftEvent(
  draftId: string,
  eventType: string,
  eventLabel: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.from("ai_draft_audit_events").insert({
      draft_id: draftId,
      event_type: eventType,
      event_label: eventLabel,
      metadata: metadata ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    /* Phase 3B audit table is additive; missing table should not block draft saves. */
  }
}

export async function getDraftAuditEvents(draftId: string): Promise<AIDraftAuditEvent[]> {
  const client = getClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from("ai_draft_audit_events")
      .select("*")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || isMissingTable(error)) return [];
    return (data ?? []) as AIDraftAuditEvent[];
  } catch { return []; }
}

export async function updateDraftStatus(
  id: string,
  status: DraftStatus,
  extras?: { review_notes?: string; approved_at?: string; published_at?: string },
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { error } = await client.from("ai_drafts").update({
      status,
      ...extras,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return { ok: false, error: classifyDbError(error) };
    await logDraftEvent(id, `status_${status}`, `Status changed to ${status.replace("_", " ")}`, extras);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: classifyDbError(err) };
  }
}

export async function createGeneratedImageRecord(
  image: Omit<AIGeneratedImage, "id" | "created_at" | "updated_at">,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const client = getClient();
  if (!client) return serviceRoleError();
  try {
    const { data, error } = await client
      .from("ai_generated_images")
      .insert({ ...image, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (image.draft_id && image.image_url) {
      await client.from("ai_drafts").update({
        image_url: image.image_url,
        image_prompt: image.prompt,
        updated_at: new Date().toISOString(),
      }).eq("id", image.draft_id);
      await logDraftEvent(image.draft_id, "image_generated", "Image generated", {
        provider: image.provider_name,
        model: image.model_name,
        target: image.target,
      });
    }
    return { ok: true, id: (data as { id: string } | null)?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to save generated image." };
  }
}
