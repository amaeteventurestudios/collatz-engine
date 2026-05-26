import type { SupabaseClient } from "@supabase/supabase-js";

export type CheckStatus = "PASS" | "FAIL";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface EngineStateVerificationRow {
  id: string;
  started_at?: string | null;
  last_checked_number: number | null;
  total_numbers_checked: number | null;
  highest_peak: number | null;
  longest_steps: number | null;
  current_status: string | null;
  last_batch_size?: number | null;
  last_batch_duration_ms?: number | null;
  numbers_per_second?: number | null;
  last_run_at?: string | null;
  worker_heartbeat_at?: string | null;
}

export interface IntegritySummary {
  ok: boolean;
  checkedAt: string;
  scope: "latest_range";
  scopeSize: number;
  highestVerifiedN: number;
  numbersCataloged: number;
  lastVerificationTime: string;
  checks: {
    duplicates: {
      ok: boolean;
      count: number;
      sample: number[];
    };
    missingRanges: {
      ok: boolean;
      count: number;
      sample: Array<{ start: number; end: number }>;
    };
    stateMatchesCatalog: {
      ok: boolean;
      details: {
        totalNumbersCheckedMatchesMaxN: boolean;
        highestPeakMatches: boolean;
        longestStepsMatches: boolean;
      };
    };
    heartbeat: {
      ok: boolean;
      ageSeconds: number | null;
    };
    statusReadable: {
      ok: boolean;
      status: string | null;
    };
  };
}

interface ResultNumberRow {
  n: number;
}

interface MetricRow {
  n?: number;
  steps?: number;
  peak?: number;
}

const ENGINE_ID = "main";
const FULL_PAGE_SIZE = 1_000;
const MAX_REPORT_ITEMS = 20;
const HEARTBEAT_RECENT_MS = 120_000;
const STATE_CATCH_UP_ATTEMPTS = 10;
const STATE_CATCH_UP_DELAY_MS = 1_000;
const DEFAULT_SUMMARY_SCOPE_SIZE = 2_000;

export function pass(name: string, detail: string): CheckResult {
  return { name, status: "PASS", detail };
}

export function fail(name: string, detail: string): CheckResult {
  return { name, status: "FAIL", detail };
}

export function formatRange(start: number, end: number): string {
  return start === end ? start.toLocaleString("en-US") : `${start.toLocaleString("en-US")}-${end.toLocaleString("en-US")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function readEngineState(
  client: SupabaseClient,
): Promise<{ state: EngineStateVerificationRow | null; error: string | null }> {
  const { data, error } = await client
    .from("collatz_engine_state")
    .select(
      "id,started_at,last_checked_number,total_numbers_checked,highest_peak,longest_steps,current_status,last_batch_size,last_batch_duration_ms,numbers_per_second,last_run_at,worker_heartbeat_at",
    )
    .eq("id", ENGINE_ID)
    .single();

  if (error || !data) {
    return {
      state: null,
      error: error?.message ?? "No state row found for id=main",
    };
  }

  return { state: data as EngineStateVerificationRow, error: null };
}

export async function readSettledEngineState(
  client: SupabaseClient,
  observedMaxN: number,
): Promise<{ state: EngineStateVerificationRow | null; error: string | null; waited: number }> {
  let latest = await readEngineState(client);

  for (let attempt = 0; latest.state && attempt < STATE_CATCH_UP_ATTEMPTS; attempt++) {
    const lastChecked = latest.state.last_checked_number ?? 0;
    const totalChecked = latest.state.total_numbers_checked ?? 0;
    if (lastChecked >= observedMaxN && totalChecked >= observedMaxN) {
      return { ...latest, waited: attempt };
    }
    await sleep(STATE_CATCH_UP_DELAY_MS);
    latest = await readEngineState(client);
  }

  return { ...latest, waited: STATE_CATCH_UP_ATTEMPTS };
}

export async function readAllResultNumbers(client: SupabaseClient): Promise<number[]> {
  const values: number[] = [];
  for (let from = 0; ; from += FULL_PAGE_SIZE) {
    const to = from + FULL_PAGE_SIZE - 1;
    const { data, error } = await client
      .from("collatz_results")
      .select("n")
      .order("n", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Unable to read result numbers: ${error.message}`);

    const rows = (data ?? []) as ResultNumberRow[];
    values.push(...rows.map((row) => row.n));

    if (rows.length < FULL_PAGE_SIZE) break;
  }
  return values;
}

export function findDuplicateValues(
  sortedValues: number[],
  limit = MAX_REPORT_ITEMS,
): number[] {
  const duplicates: number[] = [];
  let previous: number | null = null;
  let alreadyReported = false;

  for (const value of sortedValues) {
    if (value === previous) {
      if (!alreadyReported) duplicates.push(value);
      alreadyReported = true;
    } else {
      previous = value;
      alreadyReported = false;
    }

    if (duplicates.length >= limit) break;
  }

  return duplicates;
}

export function findMissingRanges(
  sortedValues: number[],
  maxN: number,
  limit = MAX_REPORT_ITEMS,
  minN = 1,
): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let expected = minN;

  for (const value of sortedValues) {
    if (value < expected) continue;
    if (value > expected) {
      ranges.push([expected, value - 1]);
      if (ranges.length >= limit) return ranges;
    }
    expected = value + 1;
  }

  if (expected <= maxN) ranges.push([expected, maxN]);
  return ranges.slice(0, limit);
}

async function readResultCount(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from("collatz_results")
    .select("*", { count: "exact", head: true });

  if (error || count == null) {
    throw new Error(error?.message ?? "Unable to count catalog rows.");
  }

  return count;
}

async function readTopMetric(
  client: SupabaseClient,
  column: "n" | "peak" | "steps",
): Promise<MetricRow> {
  const { data, error } = await client
    .from("collatz_results")
    .select("n, steps, peak")
    .order(column, { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  return ((data ?? [])[0] ?? {}) as MetricRow;
}

export async function runFullIntegrityVerification(
  client: SupabaseClient,
): Promise<{ checks: CheckResult[]; failed: number; passed: number }> {
  const checks: CheckResult[] = [];
  const initialState = await readEngineState(client);

  if (!initialState.state) {
    checks.push(fail("Engine state row", initialState.error ?? "No state row found for id=main"));
    return { checks, passed: 0, failed: 1 };
  }

  checks.push(pass("Engine state row", "Readable state row found for id=main."));

  try {
    const rowCount = await readResultCount(client);
    checks.push(pass("Catalog row count", `${rowCount.toLocaleString("en-US")} result rows readable.`));
  } catch (err) {
    checks.push(fail("Catalog row count", err instanceof Error ? err.message : "Unable to count rows."));
  }

  const numbers = await readAllResultNumbers(client);
  const maxN = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
  const uniqueCount = new Set(numbers).size;
  const settledState = await readSettledEngineState(client, maxN);

  if (!settledState.state) {
    checks.push(fail("Engine state row after result scan", settledState.error ?? "Unable to re-read state row."));
    const passed = checks.filter((check) => check.status === "PASS").length;
    return { checks, passed, failed: checks.length - passed };
  }

  const state = settledState.state;
  checks.push(
    pass(
      "Engine state after result scan",
      settledState.waited > 0
        ? `State re-read after ${settledState.waited}s to avoid a live batch timing window.`
        : "State re-read immediately after result scan.",
    ),
  );

  const duplicates = findDuplicateValues(numbers);
  checks.push(
    duplicates.length === 0
      ? pass("Duplicate n values", "No duplicate n values found in collatz_results.")
      : fail(
          "Duplicate n values",
          `First ${duplicates.length} duplicate values: ${duplicates.map((n) => n.toLocaleString("en-US")).join(", ")}`,
        ),
  );

  const missingRanges = findMissingRanges(numbers, maxN);
  checks.push(
    missingRanges.length === 0
      ? pass("Missing n ranges", `No missing values from 1 to ${maxN.toLocaleString("en-US")}.`)
      : fail(
          "Missing n ranges",
          `First ${missingRanges.length} missing ranges: ${missingRanges
            .map(([start, end]) => formatRange(start, end))
            .join(", ")}`,
        ),
  );

  const totalChecked = state.total_numbers_checked ?? 0;
  checks.push(
    totalChecked === maxN && uniqueCount === maxN
      ? pass(
          "total_numbers_checked vs max n",
          `State total ${totalChecked.toLocaleString("en-US")} matches max n ${maxN.toLocaleString("en-US")} and unique row count.`,
        )
      : fail(
          "total_numbers_checked vs max n",
          `State total=${totalChecked.toLocaleString("en-US")}, max n=${maxN.toLocaleString("en-US")}, unique rows=${uniqueCount.toLocaleString("en-US")}.`,
        ),
  );

  const lastChecked = state.last_checked_number ?? 0;
  checks.push(
    lastChecked === maxN
      ? pass(
          "last_checked_number continuity",
          `Last checked n=${lastChecked.toLocaleString("en-US")}; expected current/next n=${(lastChecked + 1).toLocaleString("en-US")}.`,
        )
      : fail(
          "last_checked_number continuity",
          `last_checked_number=${lastChecked.toLocaleString("en-US")} but max stored n=${maxN.toLocaleString("en-US")}.`,
        ),
  );

  try {
    const maxPeak = (await readTopMetric(client, "peak")).peak ?? 0;
    checks.push(
      state.highest_peak === maxPeak
        ? pass("highest_peak state record", `State highest_peak matches result max ${maxPeak.toLocaleString("en-US")}.`)
        : fail(
            "highest_peak state record",
            `State highest_peak=${(state.highest_peak ?? 0).toLocaleString("en-US")}, result max=${maxPeak.toLocaleString("en-US")}.`,
          ),
    );
  } catch (err) {
    checks.push(fail("highest_peak state record", err instanceof Error ? err.message : "Unable to read peak record."));
  }

  try {
    const maxSteps = (await readTopMetric(client, "steps")).steps ?? 0;
    checks.push(
      state.longest_steps === maxSteps
        ? pass("longest_steps state record", `State longest_steps matches result max ${maxSteps.toLocaleString("en-US")}.`)
        : fail(
            "longest_steps state record",
            `State longest_steps=${(state.longest_steps ?? 0).toLocaleString("en-US")}, result max=${maxSteps.toLocaleString("en-US")}.`,
          ),
    );
  } catch (err) {
    checks.push(fail("longest_steps state record", err instanceof Error ? err.message : "Unable to read steps record."));
  }

  const heartbeatAt = state.worker_heartbeat_at;
  const heartbeatAgeMs = heartbeatAt ? Date.now() - new Date(heartbeatAt).getTime() : Infinity;
  checks.push(
    Number.isFinite(heartbeatAgeMs) && heartbeatAgeMs >= 0 && heartbeatAgeMs <= HEARTBEAT_RECENT_MS
      ? pass("Recent worker heartbeat", `Last heartbeat ${Math.round(heartbeatAgeMs / 1000)}s ago.`)
      : fail(
          "Recent worker heartbeat",
          heartbeatAt
            ? `Last heartbeat is not recent: ${heartbeatAt}.`
            : "No worker heartbeat timestamp found.",
        ),
  );

  checks.push(
    state.current_status && state.current_status.trim().length > 0
      ? pass("current_status readable", `Current status is "${state.current_status}".`)
      : fail("current_status readable", "current_status is empty or unreadable."),
  );

  const passed = checks.filter((check) => check.status === "PASS").length;
  return { checks, passed, failed: checks.length - passed };
}

export async function getIntegritySummary(
  client: SupabaseClient,
  scopeSize = DEFAULT_SUMMARY_SCOPE_SIZE,
): Promise<IntegritySummary> {
  const checkedAt = new Date().toISOString();
  const [stateResult, numbersCataloged, maxRow, peakRow, stepsRow] = await Promise.all([
    readEngineState(client),
    readResultCount(client),
    readTopMetric(client, "n"),
    readTopMetric(client, "peak"),
    readTopMetric(client, "steps"),
  ]);

  if (!stateResult.state) {
    throw new Error(stateResult.error ?? "Live catalog state is unavailable.");
  }

  const highestVerifiedN = maxRow.n ?? 0;
  const sampleLimit = Math.max(1, Math.min(scopeSize, 10_000));
  const { data, error } = await client
    .from("collatz_results")
    .select("n")
    .order("n", { ascending: false })
    .limit(sampleLimit);

  if (error) throw new Error(error.message);

  const latestNumbers = ((data ?? []) as ResultNumberRow[])
    .map((row) => row.n)
    .sort((a, b) => a - b);
  const minSampleN = latestNumbers[0] ?? highestVerifiedN;
  const duplicates = findDuplicateValues(latestNumbers);
  const missingRanges = findMissingRanges(latestNumbers, highestVerifiedN, MAX_REPORT_ITEMS, minSampleN);
  const state = stateResult.state;
  const totalMatches = (state.total_numbers_checked ?? 0) === highestVerifiedN;
  const highestPeakMatches = (state.highest_peak ?? 0) === (peakRow.peak ?? 0);
  const longestStepsMatches = (state.longest_steps ?? 0) === (stepsRow.steps ?? 0);
  const heartbeatAt = state.worker_heartbeat_at;
  const heartbeatAgeSeconds = heartbeatAt
    ? Math.max(0, Math.floor((Date.now() - new Date(heartbeatAt).getTime()) / 1_000))
    : null;
  const heartbeatOk = heartbeatAgeSeconds !== null && heartbeatAgeSeconds <= HEARTBEAT_RECENT_MS / 1_000;
  const status = state.current_status?.trim() || null;
  const statusReadable = status !== null;
  const lastVerificationTime = state.last_run_at ?? state.worker_heartbeat_at ?? checkedAt;

  const checks: IntegritySummary["checks"] = {
    duplicates: {
      ok: duplicates.length === 0,
      count: duplicates.length,
      sample: duplicates,
    },
    missingRanges: {
      ok: missingRanges.length === 0,
      count: missingRanges.length,
      sample: missingRanges.map(([start, end]) => ({ start, end })),
    },
    stateMatchesCatalog: {
      ok: totalMatches && highestPeakMatches && longestStepsMatches,
      details: {
        totalNumbersCheckedMatchesMaxN: totalMatches,
        highestPeakMatches,
        longestStepsMatches,
      },
    },
    heartbeat: {
      ok: heartbeatOk,
      ageSeconds: heartbeatAgeSeconds,
    },
    statusReadable: {
      ok: statusReadable,
      status,
    },
  };

  return {
    ok: Object.values(checks).every((check) => check.ok),
    checkedAt,
    scope: "latest_range",
    scopeSize: sampleLimit,
    highestVerifiedN,
    numbersCataloged,
    lastVerificationTime,
    checks,
  };
}
