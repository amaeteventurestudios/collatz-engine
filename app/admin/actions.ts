"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
  verifyCredentials,
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/admin/auth";
import { MODE_PRESETS } from "@/lib/collatz/runtime-config";

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const username = (formData.get("username") as string | null) ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!verifyCredentials(username, password)) {
    redirect("/admin/login?error=invalid");
  }

  const token = await createSessionToken();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  redirect("/admin");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ── Session guard (throws if not authenticated) ───────────────────────────────

async function requireAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token))) {
    redirect("/admin/login");
  }
}

// ── Service-role Supabase client (server-side only) ───────────────────────────

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service role not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ── Form-targeted void wrappers (form action= requires void return) ───────────

export async function pauseEngineFormAction(): Promise<void> {
  await pauseEngineAction();
}

export async function resumeEngineFormAction(): Promise<void> {
  await resumeEngineAction();
}

export async function applyRecoveryModeFormAction(): Promise<void> {
  await applyModeAction("recovery");
}

export async function applySafeModeFormAction(): Promise<void> {
  await applyModeAction("safe");
}

export async function applyNormalModeFormAction(): Promise<void> {
  await applyModeAction("normal");
}

export async function runCleanupFormAction(): Promise<void> {
  await runCleanupAction();
}

// ── Engine actions ────────────────────────────────────────────────────────────

export async function pauseEngineAction(): Promise<{ ok: boolean; error?: string }> {
  await requireAdminSession();
  try {
    const client = getServiceClient();
    const { error } = await client
      .from("collatz_engine_state")
      .update({ current_status: "paused", worker_heartbeat_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", "main");
    if (error) return { ok: false, error: error.message };

    // Log the admin action
    await client.from("collatz_activity_logs").insert({
      event_type: "admin_pause",
      message: "Engine paused by admin via control panel.",
      metadata: { source: "admin_panel" },
    }).then(undefined, () => {});

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function resumeEngineAction(): Promise<{ ok: boolean; error?: string }> {
  await requireAdminSession();
  try {
    const client = getServiceClient();
    const { error } = await client
      .from("collatz_engine_state")
      .update({ current_status: "running", worker_heartbeat_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq("id", "main");
    if (error) return { ok: false, error: error.message };

    await client.from("collatz_activity_logs").insert({
      event_type: "admin_resume",
      message: "Engine resumed by admin via control panel.",
      metadata: { source: "admin_panel" },
    }).then(undefined, () => {});

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Runtime config actions ────────────────────────────────────────────────────

export async function applyModeAction(
  mode: "recovery" | "safe" | "normal",
): Promise<{ ok: boolean; error?: string }> {
  await requireAdminSession();

  const preset = MODE_PRESETS[mode];
  if (!preset) return { ok: false, error: `Unknown mode: ${mode}` };

  try {
    const client = getServiceClient();
    const { error } = await client
      .from("collatz_engine_runtime_config")
      .upsert({
        id: "main",
        mode: preset.mode ?? mode,
        batch_size: preset.batchSize,
        batch_delay_ms: preset.batchDelayMs,
        log_interval_ms: preset.logIntervalMs,
        storage_mode: preset.storageMode ?? "free-tier",
        keep_recent_results: preset.keepRecentResults,
        activity_log_retention_rows: preset.activityLogRetentionRows,
        updated_at: new Date().toISOString(),
      });

    if (error) return { ok: false, error: error.message };

    await client.from("collatz_activity_logs").insert({
      event_type: "admin_mode_change",
      message: `Runtime config set to "${mode}" mode by admin.`,
      metadata: { source: "admin_panel", mode, preset },
    }).then(undefined, () => {});

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

// ── Cleanup action ────────────────────────────────────────────────────────────

export interface CleanupResult {
  ok: boolean;
  error?: string;
  resultsBefore?: number;
  resultsAfter?: number;
  resultsDeleted?: number;
  logsBefore?: number;
  logsAfter?: number;
  logsDeleted?: number;
  ranAt?: string;
}

export async function runCleanupAction(): Promise<CleanupResult> {
  await requireAdminSession();

  try {
    const client = getServiceClient();

    // Read current retention config
    let cfgData: Record<string, number> | null = null;
    try {
      const { data } = await client
        .from("collatz_engine_runtime_config")
        .select("keep_recent_results, activity_log_retention_rows")
        .eq("id", "main")
        .single();
      cfgData = data as Record<string, number> | null;
    } catch {
      // Table might not exist yet — use recovery defaults
    }

    const keepResults = (cfgData as Record<string, number> | null)?.keep_recent_results ?? 1_000;
    const keepLogs = (cfgData as Record<string, number> | null)?.activity_log_retention_rows ?? 250;

    const { data, error } = await client.rpc("cleanup_collatz_storage", {
      p_keep_results: keepResults,
      p_keep_logs: keepLogs,
    });

    if (error) return { ok: false, error: error.message };

    const r = data as Record<string, number>;

    await client.from("collatz_activity_logs").insert({
      event_type: "admin_cleanup",
      message: `Storage cleanup by admin: deleted ${r.results_deleted ?? 0} results, ${r.logs_deleted ?? 0} logs.`,
      metadata: { source: "admin_panel", ...r },
    }).then(undefined, () => {});

    revalidatePath("/admin");

    return {
      ok: true,
      resultsBefore: r.results_before,
      resultsAfter: r.results_after,
      resultsDeleted: r.results_deleted,
      logsBefore: r.logs_before,
      logsAfter: r.logs_after,
      logsDeleted: r.logs_deleted,
      ranAt: r.ran_at as unknown as string,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
