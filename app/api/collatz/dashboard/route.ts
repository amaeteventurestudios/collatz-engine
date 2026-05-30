import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COLLATZ_CACHE_TTL_MS, secondsFromMs } from "@/lib/collatz/cache-policy";
import {
  getCachedRead,
  logReadCacheDiagnostic,
  makeReadCacheHeaders,
} from "@/lib/collatz/read-cache";
import type { EngineState } from "@/lib/collatz/store";

// PUBLIC_EVENTS_LIMIT: max public scientific events returned. Defaults to 5.
function parseEventsLimit(): number {
  const raw = process.env.PUBLIC_EVENTS_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 20);
}

// Dynamic so we can read env vars and use the in-memory cache at request time.
export const dynamic = "force-dynamic";

const PUBLIC_SCIENTIFIC_EVENT_TYPES = [
  "record_updated",
  "new_longest_trajectory",
  "new_highest_peak",
  "catalog_milestone_reached",
  "milestone_reached",
  "verified_milestone_reached",
  "record_number_checked",
  "new_record_number_checked",
  "highest_verified_n",
  "observatory_insight_published",
  "public_observatory_insight",
] as const;

const PUBLIC_EVENT_METADATA_KEYS = new Set([
  "n",
  "number",
  "record_n",
  "candidate_n",
  "peak",
  "new_peak",
  "highest_peak",
  "steps",
  "new_steps",
  "longest_steps",
  "milestone",
  "numbers_cataloged",
  "verified_n",
  "highest_verified_n",
  "observatory_note_id",
  "slug",
]);

const ENGINE_STATE_FIELDS =
  "id, started_at, last_checked_number, current_number, total_numbers_checked, highest_peak, longest_steps, current_status, updated_at, last_batch_size, last_batch_duration_ms, numbers_per_second, last_run_at, worker_heartbeat_at, last_error";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function publicMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!isRecord(metadata)) return null;

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!PUBLIC_EVENT_METADATA_KEYS.has(key)) continue;
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = typeof value === "string" ? value.slice(0, 160) : value;
    }
  }

  return Object.keys(safe).length > 0 ? safe : null;
}

function publicEventMessage(
  eventType: string,
  metadata: Record<string, unknown> | null,
): string {
  const type = eventType.toLowerCase();
  const hasSteps =
    metadata?.steps != null ||
    metadata?.new_steps != null ||
    metadata?.longest_steps != null;
  const hasPeak =
    metadata?.peak != null ||
    metadata?.new_peak != null ||
    metadata?.highest_peak != null;

  if (type.includes("longest") || hasSteps) return "New longest trajectory found";
  if (type.includes("peak") || hasPeak) return "New highest peak found";
  if (type.includes("observatory")) return "Latest public Observatory insight";
  if (type.includes("number_checked") || type.includes("highest_verified")) {
    return "New record number checked";
  }
  if (type.includes("milestone")) return "Verified milestone reached";
  return "Scientific record updated";
}

function publicEngineState(row: EngineState | null): EngineState | null {
  if (!row) return null;
  return {
    ...row,
    last_error: row.last_error
      ? "Operational error reported. Details are available to administrators."
      : null,
  };
}

export interface DashboardRecord {
  startingNumber: number;
  steps: number;
  peakValue: number;
  discoveredAt: string | null;
}

export interface DashboardEvent {
  id: string | null;
  eventType: string;
  message: string;
  batchStart: number | null;
  batchEnd: number | null;
  numbersProcessed: number | null;
  durationMs: number | null;
  numbersPerSecond: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
}

export interface DashboardNearEscape {
  n: number;
  steps: number;
  peak: number;
  peakRatio: number;
  flags: string[];
}

export interface DashboardPayload {
  ok: true;
  generatedAt: string;
  /** Cache window in seconds so clients can display accurate freshness copy. */
  cacheWindowSeconds: number;
  /** Full engine state row — same shape as EngineState from lib/collatz/store */
  engineState: EngineState | null;
  records: {
    longestTrajectories: DashboardRecord[];
    highestPeaks: DashboardRecord[];
  };
  meaningfulEvents: DashboardEvent[];
  /** Near-escape candidates are served from all-time records, not collatz_results. */
  nearEscapes: DashboardNearEscape[];
}

async function readDashboardPayload(eventsLimit: number): Promise<DashboardPayload> {
  const client = getServiceClient();
  if (!client) {
    throw new Error("Supabase not configured");
  }

  const [stateRes, longestRes, peakRes, eventsRes] = await Promise.all([
    client
      .from("collatz_engine_state")
      .select(ENGINE_STATE_FIELDS)
      .eq("id", "main")
      .single(),
    client
      .from("collatz_all_time_records")
      .select("starting_number, steps, peak_value, discovered_at")
      .eq("record_category", "longest_trajectory")
      .order("steps", { ascending: false })
      .limit(10),
    client
      .from("collatz_all_time_records")
      .select("starting_number, steps, peak_value, discovered_at")
      .eq("record_category", "highest_peak")
      .order("peak_value", { ascending: false })
      .limit(10),
    client
      .from("collatz_activity_logs")
      .select(
        "id, event_type, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
      )
      .in("event_type", [...PUBLIC_SCIENTIFIC_EVENT_TYPES])
      .order("created_at", { ascending: false })
      .limit(eventsLimit),
  ]);

  if (stateRes.error) throw new Error(stateRes.error.message);
  if (longestRes.error) throw new Error(longestRes.error.message);
  if (peakRes.error) throw new Error(peakRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const engineState = publicEngineState((stateRes.data ?? null) as EngineState | null);

  const longestTrajectories: DashboardRecord[] = (longestRes.data ?? []).map((r) => ({
    startingNumber: Number(r.starting_number),
    steps: Number(r.steps),
    peakValue: Number(r.peak_value),
    discoveredAt: (r.discovered_at as string | null) ?? null,
  }));

  const highestPeaks: DashboardRecord[] = (peakRes.data ?? []).map((r) => ({
    startingNumber: Number(r.starting_number),
    steps: Number(r.steps),
    peakValue: Number(r.peak_value),
    discoveredAt: (r.discovered_at as string | null) ?? null,
  }));

  const meaningfulEvents: DashboardEvent[] = (eventsRes.data ?? []).map((r) => {
    const eventType = String(r.event_type ?? "");
    const metadata = publicMetadata(r.metadata);
    return {
      id: (r.id as string | null) ?? null,
      eventType,
      message: publicEventMessage(eventType, metadata),
      batchStart: r.batch_start != null ? Number(r.batch_start) : null,
      batchEnd: r.batch_end != null ? Number(r.batch_end) : null,
      numbersProcessed:
        r.numbers_processed != null ? Number(r.numbers_processed) : null,
      durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
      numbersPerSecond:
        r.numbers_per_second != null ? Number(r.numbers_per_second) : null,
      metadata,
      createdAt: (r.created_at as string | null) ?? null,
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    cacheWindowSeconds: secondsFromMs(COLLATZ_CACHE_TTL_MS.PUBLIC_DASHBOARD),
    engineState,
    records: { longestTrajectories, highestPeaks },
    meaningfulEvents,
    nearEscapes: [],
  };
}

export async function GET() {
  const startedAt = Date.now();
  const ttlMs = COLLATZ_CACHE_TTL_MS.PUBLIC_DASHBOARD;
  const eventsLimit = parseEventsLimit();

  try {
    const { data, meta } = await getCachedRead(
      `collatz:dashboard:v1:events=${eventsLimit}`,
      ttlMs,
      () => readDashboardPayload(eventsLimit),
    );
    logReadCacheDiagnostic("api/collatz/dashboard", meta, startedAt, data);
    return NextResponse.json(data, {
      headers: makeReadCacheHeaders(meta, {
        ttlMs,
        visibility: "public",
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Dashboard data unavailable.";
    return NextResponse.json(
      { ok: false, error: message },
      {
        status: message === "Supabase not configured" ? 503 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
