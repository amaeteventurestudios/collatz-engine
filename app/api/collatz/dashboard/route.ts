import { createClient } from "@supabase/supabase-js";
import type { EngineState } from "@/lib/collatz/store";

// 10-second server-side cache shared across all visitors.
// Browser also allowed to serve stale for 5 s while revalidating.
export const revalidate = 10;
export const dynamic = "force-static";

// High-signal event types shown on the public homepage.
// Noisy routine events (batch_started, batch_completed, worker_heartbeat) are excluded.
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
  /** Full engine state row — same shape as EngineState from lib/collatz/store */
  engineState: EngineState | null;
  records: {
    longestTrajectories: DashboardRecord[];
    highestPeaks: DashboardRecord[];
  };
  meaningfulEvents: DashboardEvent[];
  nearEscapes: DashboardNearEscape[];
}

export async function GET() {
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
    const [stateRes, longestRes, peakRes, eventsRes, nearEscapeRes] =
      await Promise.all([
        // Full engine state row
        client
          .from("collatz_engine_state")
          .select("*")
          .eq("id", "main")
          .single(),

        // Top 10 all-time trajectory records (permanent, not rolling buffer)
        client
          .from("collatz_all_time_records")
          .select(
            "starting_number, steps, peak_value, discovered_at",
          )
          .eq("record_category", "longest_trajectory")
          .order("steps", { ascending: false })
          .limit(10),

        // Top 10 all-time peak records
        client
          .from("collatz_all_time_records")
          .select(
            "starting_number, steps, peak_value, discovered_at",
          )
          .eq("record_category", "highest_peak")
          .order("peak_value", { ascending: false })
          .limit(10),

        // Most recent high-signal activity events (excluding routine batch noise)
        client
          .from("collatz_activity_logs")
          .select(
            "id, event_type, message, batch_start, batch_end, numbers_processed, duration_ms, numbers_per_second, metadata, created_at",
          )
          .not("event_type", "in", `(${[...EXCLUDED_EVENT_TYPES].map((t) => `"${t}"`).join(",")})`)
          .order("created_at", { ascending: false })
          .limit(5),

        // Near-escape candidates: top 50 by peak → sorted by peak/n ratio server-side
        client
          .from("collatz_results")
          .select("n, steps, peak")
          .order("peak", { ascending: false })
          .limit(50),
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

    const meaningfulEvents: DashboardEvent[] = (
      eventsRes.data ?? []
    )
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
          r.metadata != null
            ? (r.metadata as Record<string, unknown>)
            : null,
        createdAt: (r.created_at as string | null) ?? null,
      }));

    // Sort near-escape candidates by peak/n ratio descending, keep top 5
    const nearEscapes: DashboardNearEscape[] = (nearEscapeRes.data ?? [])
      .map((r) => {
        const n = Number(r.n);
        const steps = Number(r.steps);
        const peak = Number(r.peak);
        const peakRatio = n > 0 ? peak / n : 0;
        const flags: string[] = [];
        if (peakRatio > 50) flags.push("high_peak_ratio");
        if (steps > 150) flags.push("long_path");
        return { n, steps, peak, peakRatio, flags };
      })
      .sort((a, b) => b.peakRatio - a.peakRatio)
      .slice(0, 5);

    const payload: DashboardPayload = {
      ok: true,
      generatedAt: new Date().toISOString(),
      engineState,
      records: { longestTrajectories, highestPeaks },
      meaningfulEvents,
      nearEscapes,
    };

    return Response.json(payload, {
      headers: {
        "Cache-Control":
          "public, s-maxage=10, stale-while-revalidate=5",
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
