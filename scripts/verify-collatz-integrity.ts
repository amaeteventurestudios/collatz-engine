/**
 * Read-only Collatz catalog integrity verification.
 *
 * Usage:
 *   npm run collatz:verify
 */

import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

type CheckStatus = "PASS" | "FAIL";

interface CheckResult {
  name: string;
  status: CheckStatus;
  detail: string;
}

interface EngineStateRow {
  id: string;
  last_checked_number: number | null;
  total_numbers_checked: number | null;
  highest_peak: number | null;
  longest_steps: number | null;
  current_status: string | null;
  worker_heartbeat_at?: string | null;
}

interface ResultRow {
  n: number;
}

const PAGE_SIZE = 1_000;
const MAX_REPORT_ITEMS = 20;
const HEARTBEAT_RECENT_MS = 120_000;
const STATE_CATCH_UP_ATTEMPTS = 10;
const STATE_CATCH_UP_DELAY_MS = 1_000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function pass(name: string, detail: string): CheckResult {
  return { name, status: "PASS", detail };
}

function fail(name: string, detail: string): CheckResult {
  return { name, status: "FAIL", detail };
}

function printCheck(check: CheckResult): void {
  const marker = check.status.padEnd(4, " ");
  console.log(`${marker}  ${check.name}`);
  console.log(`      ${check.detail}`);
}

function formatRange(start: number, end: number): string {
  return start === end ? fmt(start) : `${fmt(start)}-${fmt(end)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readEngineState(
  client: SupabaseClient,
): Promise<{ state: EngineStateRow | null; error: string | null }> {
  const { data, error } = await client
    .from("collatz_engine_state")
    .select(
      "id,last_checked_number,total_numbers_checked,highest_peak,longest_steps,current_status,worker_heartbeat_at",
    )
    .eq("id", "main")
    .single();

  if (error || !data) return { state: null, error: error?.message ?? "No state row found for id=main" };
  return { state: data as EngineStateRow, error: null };
}

async function readSettledEngineState(
  client: SupabaseClient,
  observedMaxN: number,
): Promise<{ state: EngineStateRow | null; error: string | null; waited: number }> {
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

async function readAllResultNumbers(
  client: SupabaseClient,
): Promise<number[]> {
  const values: number[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from("collatz_results")
      .select("n")
      .order("n", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Unable to read collatz_results.n: ${error.message}`);

    const rows = (data ?? []) as ResultRow[];
    values.push(...rows.map((row) => row.n));

    if (rows.length < PAGE_SIZE) break;
  }
  return values;
}

function findDuplicateValues(sortedValues: number[]): number[] {
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

    if (duplicates.length >= MAX_REPORT_ITEMS) break;
  }

  return duplicates;
}

function findMissingRanges(sortedValues: number[], maxN: number): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let expected = 1;

  for (const value of sortedValues) {
    if (value < expected) continue;
    if (value > expected) {
      ranges.push([expected, value - 1]);
      if (ranges.length >= MAX_REPORT_ITEMS) return ranges;
    }
    expected = value + 1;
  }

  if (expected <= maxN) ranges.push([expected, maxN]);
  return ranges.slice(0, MAX_REPORT_ITEMS);
}

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("FAIL  Supabase configuration");
    console.error("      NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const checks: CheckResult[] = [];

  const initialState = await readEngineState(client);

  if (!initialState.state) {
    checks.push(fail("Engine state row", initialState.error ?? "No state row found for id=main"));
    checks.forEach(printCheck);
    console.log("\nSummary: 0 passed, 1 failed");
    process.exit(1);
  }

  checks.push(pass("Engine state row", "Readable state row found for id=main."));

  const { count: rowCount, error: countError } = await client
    .from("collatz_results")
    .select("*", { count: "exact", head: true });

  if (countError || rowCount == null) {
    checks.push(fail("Catalog row count", countError?.message ?? "Unable to count rows."));
  } else {
    checks.push(pass("Catalog row count", `${fmt(rowCount)} result rows readable.`));
  }

  const numbers = await readAllResultNumbers(client);
  const maxN = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
  const uniqueCount = new Set(numbers).size;
  const settledState = await readSettledEngineState(client, maxN);

  if (!settledState.state) {
    checks.push(fail("Engine state row after result scan", settledState.error ?? "Unable to re-read state row."));
    checks.forEach(printCheck);
    console.log(`\nSummary: ${checks.filter((check) => check.status === "PASS").length} passed, 1 failed`);
    process.exit(1);
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
          `First ${duplicates.length} duplicate values: ${duplicates.map(fmt).join(", ")}`,
        ),
  );

  const missingRanges = findMissingRanges(numbers, maxN);
  checks.push(
    missingRanges.length === 0
      ? pass("Missing n ranges", `No missing values from 1 to ${fmt(maxN)}.`)
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
          `State total ${fmt(totalChecked)} matches max n ${fmt(maxN)} and unique row count.`,
        )
      : fail(
          "total_numbers_checked vs max n",
          `State total=${fmt(totalChecked)}, max n=${fmt(maxN)}, unique rows=${fmt(uniqueCount)}.`,
        ),
  );

  const lastChecked = state.last_checked_number ?? 0;
  checks.push(
    lastChecked === maxN
      ? pass(
          "last_checked_number continuity",
          `Last checked n=${fmt(lastChecked)}; expected current/next n=${fmt(lastChecked + 1)}.`,
        )
      : fail(
          "last_checked_number continuity",
          `last_checked_number=${fmt(lastChecked)} but max stored n=${fmt(maxN)}.`,
        ),
  );

  const { data: peakRows, error: peakError } = await client
    .from("collatz_results")
    .select("peak")
    .order("peak", { ascending: false })
    .limit(1);

  const maxPeak = peakRows?.[0]?.peak ?? 0;
  checks.push(
    peakError
      ? fail("highest_peak state record", peakError.message)
      : state.highest_peak === maxPeak
        ? pass("highest_peak state record", `State highest_peak matches result max ${fmt(maxPeak)}.`)
        : fail(
            "highest_peak state record",
            `State highest_peak=${fmt(state.highest_peak ?? 0)}, result max=${fmt(maxPeak)}.`,
          ),
  );

  const { data: stepRows, error: stepError } = await client
    .from("collatz_results")
    .select("steps")
    .order("steps", { ascending: false })
    .limit(1);

  const maxSteps = stepRows?.[0]?.steps ?? 0;
  checks.push(
    stepError
      ? fail("longest_steps state record", stepError.message)
      : state.longest_steps === maxSteps
        ? pass("longest_steps state record", `State longest_steps matches result max ${fmt(maxSteps)}.`)
        : fail(
            "longest_steps state record",
            `State longest_steps=${fmt(state.longest_steps ?? 0)}, result max=${fmt(maxSteps)}.`,
          ),
  );

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

  console.log("\nCollatz Integrity Verification\n");
  checks.forEach(printCheck);

  const passed = checks.filter((check) => check.status === "PASS").length;
  const failed = checks.length - passed;
  console.log(`\nSummary: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\nFAIL  Verification script");
  console.error(`      ${message}`);
  process.exit(1);
});
