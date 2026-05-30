import type { SupabaseClient } from "@supabase/supabase-js";
import { secondsSince } from "@/lib/collatz/api";
import { getLatestIntegrityRun } from "@/lib/collatz/integrity-runs";
import type { PublicLatestIntegrityRun } from "@/lib/collatz/integrity-runs";
import { readEngineState } from "@/lib/collatz/verify";
import type { EngineStateVerificationRow } from "@/lib/collatz/verify";

export type WorkerHealthStatus = "live" | "delayed" | "stalled" | "stopped" | "error";
export type WorkerHealthSeverity = "info" | "warning" | "critical";

export interface PublicOperationalEvent {
  eventType: string;
  severity: WorkerHealthSeverity;
  message: string;
  observedAt: string;
  heartbeatAgeSeconds: number | null;
  numbersCataloged: number | null;
}

export interface PublicHealthSnapshot {
  ok: true;
  status: WorkerHealthStatus;
  heartbeatAgeSeconds: number | null;
  numbersCataloged: number;
  currentStatus: string | null;
  numbersPerSecond: number;
  lastRunAt: string | null;
  lastBatchSize: number;
  lastBatchDurationMs: number;
  lastFullIntegrityRun: PublicLatestIntegrityRun | null;
  message: string;
  latestEvents: PublicOperationalEvent[];
}

export interface WorkerHealthAssessment {
  status: WorkerHealthStatus;
  severity: WorkerHealthSeverity;
  eventType: string;
  message: string;
  heartbeatAgeSeconds: number | null;
}

const LIVE_HEARTBEAT_SECONDS = 30;
const STALLED_HEARTBEAT_SECONDS = 120;
const OPERATIONAL_EVENT_TYPES = [
  "heartbeat_ok",
  "heartbeat_delayed",
  "worker_stalled",
  "worker_recovered",
  "worker_stopped",
  "worker_error",
  "verification_passed",
  "verification_failed",
  "service_restart_detected",
];

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberText(value: number): string {
  return value.toLocaleString("en-US");
}

export function assessWorkerHealth(
  state: EngineStateVerificationRow,
): WorkerHealthAssessment {
  const heartbeatAgeSeconds = secondsSince(state.worker_heartbeat_at);
  const ageForComparison = heartbeatAgeSeconds ?? Infinity;

  if (state.last_error) {
    return {
      status: "error",
      severity: "critical",
      eventType: "worker_error",
      message: `Worker error reported: ${state.last_error.slice(0, 180)}`,
      heartbeatAgeSeconds,
    };
  }

  if (state.current_status !== "running") {
    return {
      status: "stopped",
      severity: "info",
      eventType: "worker_stopped",
      message: "Worker stopped by status.",
      heartbeatAgeSeconds,
    };
  }

  if (ageForComparison <= LIVE_HEARTBEAT_SECONDS) {
    return {
      status: "live",
      severity: "info",
      eventType: "heartbeat_ok",
      message: `Worker live, heartbeat ${numberText(ageForComparison)}s ago.`,
      heartbeatAgeSeconds,
    };
  }

  if (ageForComparison <= STALLED_HEARTBEAT_SECONDS) {
    return {
      status: "delayed",
      severity: "warning",
      eventType: "heartbeat_delayed",
      message: `Worker delayed, heartbeat ${numberText(ageForComparison)}s ago.`,
      heartbeatAgeSeconds,
    };
  }

  return {
    status: "stalled",
    severity: "critical",
    eventType: "worker_stalled",
    message:
      heartbeatAgeSeconds == null
        ? "Worker stalled; no heartbeat has been recorded."
        : `Worker stalled, heartbeat ${numberText(heartbeatAgeSeconds)}s ago.`,
    heartbeatAgeSeconds,
  };
}

export async function getPublicHealthSnapshot(
  client: SupabaseClient,
): Promise<PublicHealthSnapshot> {
  const { state, error } = await readEngineState(client);
  if (!state) {
    throw new Error(error ?? "Live engine state is unavailable.");
  }

  const latestIntegrityRun = await getLatestIntegrityRun(client).catch(() => null);
  const assessment = assessWorkerHealth(state);

  return {
    ok: true,
    status: assessment.status,
    heartbeatAgeSeconds: assessment.heartbeatAgeSeconds,
    numbersCataloged: toNumber(state.total_numbers_checked),
    currentStatus: state.current_status ?? null,
    numbersPerSecond: toNumber(state.numbers_per_second),
    lastRunAt: state.last_run_at ?? null,
    lastBatchSize: toNumber(state.last_batch_size),
    lastBatchDurationMs: toNumber(state.last_batch_duration_ms),
    lastFullIntegrityRun: latestIntegrityRun,
    message: publicHealthMessage(assessment.status),
    // Public health exposes summary signals only. Activity-log details remain admin-only.
    latestEvents: [],
  };
}

export async function recordWorkerHealthEventIfNeeded(
  client: SupabaseClient,
  state: EngineStateVerificationRow,
  assessment: WorkerHealthAssessment,
): Promise<{ inserted: boolean; eventType: string }> {
  const { data } = await client
    .from("collatz_activity_logs")
    .select("event_type")
    .in("event_type", OPERATIONAL_EVENT_TYPES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousEventType = (data as { event_type?: string } | null)?.event_type ?? null;
  const recovered =
    assessment.status === "live" &&
    (previousEventType === "heartbeat_delayed" ||
      previousEventType === "worker_stalled" ||
      previousEventType === "worker_error");
  const eventType = recovered ? "worker_recovered" : assessment.eventType;
  const shouldInsert = assessment.severity === "critical" || previousEventType !== eventType;

  if (!shouldInsert) return { inserted: false, eventType };

  const { error } = await client.from("collatz_activity_logs").insert({
    event_type: eventType,
    message: recovered ? "Worker recovered; heartbeat is fresh again." : assessment.message,
    numbers_processed: state.total_numbers_checked ?? null,
    numbers_per_second: state.numbers_per_second ?? null,
    metadata: {
      severity: recovered ? "info" : assessment.severity,
      observed_at: new Date().toISOString(),
      engine_status: state.current_status ?? null,
      heartbeat_age_seconds: assessment.heartbeatAgeSeconds,
      numbers_cataloged: state.total_numbers_checked ?? null,
      health_status: recovered ? "live" : assessment.status,
    },
  });

  if (error) throw new Error(error.message);
  return { inserted: true, eventType };
}

export function publicHealthMessage(status: WorkerHealthStatus): string {
  if (status === "live") return "Engine is live.";
  if (status === "delayed") return "Engine heartbeat is delayed.";
  if (status === "stalled") return "Engine heartbeat is stalled.";
  if (status === "error") return "Engine reported an operational error.";
  return "Engine is stopped.";
}
