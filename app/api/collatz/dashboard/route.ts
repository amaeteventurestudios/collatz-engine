import { createClient } from "@supabase/supabase-js";
import type { EngineState } from "@/lib/collatz/store";

// ── Env-configurable cache window ─────────────────────────────────────────────
// PUBLIC_DASHBOARD_CACHE_SECONDS: how long the server-side in-memory cache is
// valid. Clamped to [30, 300]. Defaults to 60.
function parseCacheSeconds(): number {
  const raw = process.env.PUBLIC_DASHBOARD_CACHE_SECONDS;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 30) return 60;
  return Math.min(n, 300);
}

// PUBLIC_EVENTS_LIMIT: max high-signal activity events returned. Defaults to 5.
function parseEventsLimit(): number {
  const raw = process.env.PUBLIC_EVENTS_LIMIT;
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return 5;
  return Math.min(n, 20);
}

// ── Module-level in-memory cache ──────────────────────────────────────────────
// Shared across warm lambda invocations. First request per cache window hits
// Supabase; all subsequent requests within the window are served instantly.
interface CacheEntry {
  payload: DashboardPayload;
  generatedAt: number; // Date.now() ms
  expiresAt: number;   // Date.now() + cacheWindowMs
}

let moduleCache: CacheEntry | null = null;

// Dynamic so we can read env vars and use the in-memory cache at request time.
export const dynamic = "force-dynamic";

// High-signal event types shown on the public homepage.
// Routine batch noise (batch_started, batch_completed, worker_heartbeat) is excluded.
const EXCLUDED_EVENT_TYPES = new Set([
  "batch_started",
  "batch_completed",
  "worker_heartbeat",
  "heartbeat_ok",
]);

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
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

export async function GET() {
  const cacheWindowSeconds = parseCacheSeconds();
  const cacheWindowMs = cacheWindowSeconds * 1000;
  const eventsLimit = parseEventsLimit();

  // ── Serve from in-memory cache if still fresh ─────────────────────────────
  const now = Date.now();
  if (moduleCache && now < moduleCache.expiresAt) {
    return Response.json(moduleCache.payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheWindowSeconds}, stale-while-revalidate=${Math.floor(cacheWindowSeconds / 2)}`,
        "X-Cache": "HIT",
        "X-Cache-Expires-In": String(Math.ceil((moduleCache.expiresAt - now) / 1000)),
      },
    });
  }

  const client = getServiceClient();
  if (!client) {
    return Response.json(
      { ok: false, error: "Supabase not configured" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  try {
    const [stateRes, longestRes, peakRes, eventsRes] = await Promise.all([
      // Full engine state row
      client
        .from("collatz_engine_state")
        .select("*")
        .eq("id", "main")
        .single(),

      // Top 10 all-time trajectory records (permanent, not rolling buffer)
      client
        .from("collatz_all_time_records")
        .select("starting_number, steps, peak_value, discovered_at")
        .eq("record_category", "longest_trajectory")
        .order("steps", { ascending: false })
        .limit(10),

      // Top 10 all-time peak records
      client
        .from("collatz_all_time_records")
        .select("starting_number, steps, peak_value, discovered_at")
        .eq("record_category", "highest_peak")
        .order("peak_value", { ascending: false })
        .limit(10),

      // Most recent high-signal activity events (excluding routine batch noise)
      client
        .from("collatz_activity_logs")
        .select(
          "id, event_type, message, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
        )
        .not(
          "event_type",
          "in",
          `(${[...EXCLUDED_EVENT_TYPES].map((t) => `"${t}"`).join(",")})`,
        )
        .order("created_at", { ascending: false })
        .limit(eventsLimit),
    ]);

    const engineState = (stateRes.data ?? null) as EngineState | null;

    const longestTrajectories: DashboardRecord[] = (
      longestRes.data ?? []
    ).map((r) => ({
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

    const meaningfulEvents: DashboardEvent[] = (eventsRes.data ?? [])
      .filter((row) => !EXCLUDED_EVENT_TYPES.has(row.event_type as string))
      .map((r) => ({
        id: (r.id as string | null) ?? null,
        eventType: r.event_type as string,
        message: r.message as string,
        batchStart: r.batch_start != null ? Number(r.batch_start) : null,
        batchEnd: r.batch_end != null ? Number(r.batch_end) : null,
        numbersProcessed:
          r.numbers_processed != null ? Number(r.numbers_processed) : null,
        durationMs: r.duration_ms != null ? Number(r.duration_ms) : null,
        numbersPerSecond:
          r.numbers_per_second != null ? Number(r.numbers_per_second) : null,
        metadata:
          r.metadata != null ? (r.metadata as Record<string, unknown>) : null,
        createdAt: (r.created_at as string | null) ?? null,
      }));

    const payload: DashboardPayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      cacheWindowSeconds,
      engineState,
      records: { longestTrajectories, highestPeaks },
      meaningfulEvents,
      nearEscapes: [], // collatz_results not queried on public dashboard
    };

    // Populate the module-level cache
    moduleCache = {
      payload,
      generatedAt: Date.now(),
      expiresAt: Date.now() + cacheWindowMs,
    };

    return Response.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${cacheWindowSeconds}, stale-while-revalidate=${Math.floor(cacheWindowSeconds / 2)}`,
        "X-Cache": "MISS",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Dashboard data unavailable.";
    return Response.json(
      { ok: false, error: message },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
