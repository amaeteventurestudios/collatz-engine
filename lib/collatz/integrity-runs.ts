import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FullIntegrityVerificationResult,
  PersistedIntegrityStatus,
} from "@/lib/collatz/verify";

export interface IntegrityRunInsert {
  status: PersistedIntegrityStatus;
  checkedAt: string;
  highestVerifiedN: number | null;
  numbersCataloged: number | null;
  checksPassed: number;
  checksFailed: number;
  duplicateCount: number | null;
  missingRangeCount: number | null;
  stateMatchesCatalog: boolean | null;
  highestPeakMatches: boolean | null;
  longestStepsMatches: boolean | null;
  heartbeatRecent: boolean | null;
  engineStatus: string | null;
  durationMs: number;
  summary: Record<string, unknown>;
  errorMessage: string | null;
}

export interface PublicLatestIntegrityRun {
  status: PersistedIntegrityStatus;
  checkedAt: string;
  highestVerifiedN: number | null;
  numbersCataloged: number | null;
  checksPassed: number | null;
  checksFailed: number | null;
  durationMs: number | null;
  duplicateCount: number | null;
  missingRangeCount: number | null;
  stateMatchesCatalog: boolean | null;
  recordsMatchCatalog: boolean | null;
  heartbeatRecent: boolean | null;
}

interface IntegrityRunRow {
  status?: string | null;
  checked_at?: string | null;
  highest_verified_n?: number | string | null;
  numbers_cataloged?: number | string | null;
  checks_passed?: number | string | null;
  checks_failed?: number | string | null;
  duplicate_count?: number | string | null;
  missing_range_count?: number | string | null;
  state_matches_catalog?: boolean | null;
  highest_peak_matches?: boolean | null;
  longest_steps_matches?: boolean | null;
  heartbeat_recent?: boolean | null;
  duration_ms?: number | string | null;
}

function toInteger(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function toStatus(value: string | null | undefined): PersistedIntegrityStatus {
  if (value === "passed" || value === "failed" || value === "warning") return value;
  return "warning";
}

export function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/\s+/g, " ").trim().slice(0, 500) || "Unknown verification error.";
}

export function integrityRunFromResult(
  result: FullIntegrityVerificationResult,
  errorMessage: string | null = null,
): IntegrityRunInsert {
  return {
    status: result.status,
    checkedAt: result.checkedAt,
    highestVerifiedN: result.highestVerifiedN,
    numbersCataloged: result.numbersCataloged,
    checksPassed: result.passed,
    checksFailed: result.failed,
    duplicateCount: result.duplicateCount,
    missingRangeCount: result.missingRangeCount,
    stateMatchesCatalog: result.stateMatchesCatalog,
    highestPeakMatches: result.highestPeakMatches,
    longestStepsMatches: result.longestStepsMatches,
    heartbeatRecent: result.heartbeatRecent,
    engineStatus: result.engineStatus,
    durationMs: result.durationMs,
    summary: result.summary,
    errorMessage,
  };
}

export function thrownIntegrityRun(error: unknown, startedAtMs: number): IntegrityRunInsert {
  const message = safeErrorMessage(error);
  return {
    status: "failed",
    checkedAt: new Date().toISOString(),
    highestVerifiedN: null,
    numbersCataloged: null,
    checksPassed: 0,
    checksFailed: 1,
    duplicateCount: null,
    missingRangeCount: null,
    stateMatchesCatalog: null,
    highestPeakMatches: null,
    longestStepsMatches: null,
    heartbeatRecent: null,
    engineStatus: null,
    durationMs: Date.now() - startedAtMs,
    summary: {
      checks: [
        {
          name: "Verification script",
          status: "FAIL",
          detail: message,
        },
      ],
      duplicateSample: [],
      missingRangeSample: [],
      lastCheckedNumber: null,
      totalNumbersChecked: null,
      uniqueNumbersCataloged: null,
      stateCaughtUpAfterSeconds: null,
    },
    errorMessage: message,
  };
}

export async function persistIntegrityRun(
  client: SupabaseClient,
  run: IntegrityRunInsert,
): Promise<void> {
  const { error } = await client.from("collatz_integrity_runs").insert({
    status: run.status,
    checked_at: run.checkedAt,
    highest_verified_n: run.highestVerifiedN,
    numbers_cataloged: run.numbersCataloged,
    checks_passed: run.checksPassed,
    checks_failed: run.checksFailed,
    duplicate_count: run.duplicateCount,
    missing_range_count: run.missingRangeCount,
    state_matches_catalog: run.stateMatchesCatalog,
    highest_peak_matches: run.highestPeakMatches,
    longest_steps_matches: run.longestStepsMatches,
    heartbeat_recent: run.heartbeatRecent,
    engine_status: run.engineStatus,
    duration_ms: run.durationMs,
    summary: run.summary,
    error_message: run.errorMessage,
  });

  if (error) {
    throw new Error(`Unable to persist integrity run: ${error.message}`);
  }
}

export function toPublicLatestIntegrityRun(
  row: IntegrityRunRow,
): PublicLatestIntegrityRun {
  const highestPeakMatches = row.highest_peak_matches ?? null;
  const longestStepsMatches = row.longest_steps_matches ?? null;

  return {
    status: toStatus(row.status),
    checkedAt: row.checked_at ?? "",
    highestVerifiedN: toInteger(row.highest_verified_n),
    numbersCataloged: toInteger(row.numbers_cataloged),
    checksPassed: toInteger(row.checks_passed),
    checksFailed: toInteger(row.checks_failed),
    durationMs: toInteger(row.duration_ms),
    duplicateCount: toInteger(row.duplicate_count),
    missingRangeCount: toInteger(row.missing_range_count),
    stateMatchesCatalog: row.state_matches_catalog ?? null,
    recordsMatchCatalog:
      highestPeakMatches == null || longestStepsMatches == null
        ? null
        : highestPeakMatches && longestStepsMatches,
    heartbeatRecent: row.heartbeat_recent ?? null,
  };
}

export async function getLatestIntegrityRun(
  client: SupabaseClient,
): Promise<PublicLatestIntegrityRun | null> {
  const { data, error } = await client
    .from("collatz_integrity_runs")
    .select(
      [
        "status",
        "checked_at",
        "highest_verified_n",
        "numbers_cataloged",
        "checks_passed",
        "checks_failed",
        "duplicate_count",
        "missing_range_count",
        "state_matches_catalog",
        "highest_peak_matches",
        "longest_steps_matches",
        "heartbeat_recent",
        "duration_ms",
      ].join(","),
    )
    .order("checked_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toPublicLatestIntegrityRun(data as IntegrityRunRow) : null;
}
