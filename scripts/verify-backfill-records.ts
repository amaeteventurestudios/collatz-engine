import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

interface Candidate {
  n: number;
  steps: number;
  peak: bigint;
}

let passed = 0;
let failed = 0;
let warned = 0;

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const text = readFileSync(".env.local", "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ??= value;
  }
}

loadLocalEnv();

function pass(message: string) {
  passed++;
  console.log(`  [PASS] ${message}`);
}

function fail(message: string, detail?: string) {
  failed++;
  console.log(`  [FAIL] ${message}${detail ? ` — ${detail}` : ""}`);
}

function warn(message: string, detail?: string) {
  warned++;
  console.log(`  [WARN] ${message}${detail ? ` — ${detail}` : ""}`);
}

function compute(nStart: number): Candidate {
  let n = BigInt(nStart);
  let peak = n;
  let steps = 0;
  while (n !== 1n) {
    n = n % 2n === 0n ? n / 2n : 3n * n + 1n;
    if (n > peak) peak = n;
    steps++;
  }
  return { n: nStart, steps, peak };
}

function topRange(start: number, end: number) {
  const rows: Candidate[] = [];
  for (let n = start; n <= end; n++) rows.push(compute(n));
  const longest = [...rows].sort((a, b) => b.steps - a.steps || a.n - b.n);
  const peaks = [...rows].sort((a, b) => {
    if (a.peak !== b.peak) return a.peak > b.peak ? -1 : 1;
    return a.n - b.n;
  });
  return { longest, peaks };
}

async function main() {
  console.log("\nHistorical Records Backfill Verifier");
  console.log("------------------------------------");

  const migration = readFileSync("supabase/phase-3h-record-backfill-state.sql", "utf8");
  if (
    migration.includes("CREATE TABLE IF NOT EXISTS public.collatz_record_backfill_state") &&
    migration.includes("CHECK (status IN ('idle', 'running', 'paused', 'completed', 'failed'))")
  ) {
    pass("Backfill state migration defines collatz_record_backfill_state with required statuses");
  } else {
    fail("Backfill state migration is missing required table or statuses");
  }

  const script = readFileSync("scripts/backfill-collatz-records.ts", "utf8");
  const forbiddenWrites = [
    ".from(\"collatz_results\")",
    ".from('collatz_results')",
    ".from(\"collatz_engine_state\").update",
    ".from('collatz_engine_state').update",
    "acquireWorkerLock",
    "releaseWorkerLock",
    "cleanup_collatz_storage",
  ];
  const foundForbidden = forbiddenWrites.filter((needle) => script.includes(needle));
  if (foundForbidden.length === 0) {
    pass("Backfill script does not write collatz_results, update engine state, touch worker lock, or run cleanup");
  } else {
    fail("Backfill script contains forbidden write/lock paths", foundForbidden.join(", "));
  }

  if (
    script.includes(".from(\"collatz_all_time_records\")") &&
    script.includes(".from(\"collatz_record_backfill_state\")") &&
    script.includes("historical_backfill")
  ) {
    pass("Backfill script writes only the intended record/state tables with source historical_backfill");
  } else {
    fail("Backfill script does not clearly target the intended tables/source");
  }

  const { longest, peaks } = topRange(1, 1_000);
  const topLongest = longest[0];
  const topPeak = peaks[0];
  if (topLongest.n === 871 && topLongest.steps === 178) {
    pass("Known dry-run longest result for n=1..1000 is n=871 with 178 steps");
  } else {
    fail("Known dry-run longest result is incorrect", `got n=${topLongest.n}, steps=${topLongest.steps}`);
  }

  if (topPeak.n === 703 && topPeak.peak === 250_504n) {
    pass("Known dry-run peak result for n=1..1000 is n=703 with peak 250504");
  } else {
    fail("Known dry-run peak result is incorrect", `got n=${topPeak.n}, peak=${topPeak.peak.toString()}`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) {
    warn("Skipping database checks because Supabase service-role env vars are not set");
  } else {
    const client = createClient(url, key, { auth: { persistSession: false } });
    const { error: stateError } = await client
      .from("collatz_record_backfill_state")
      .select("id, status, current_number, target_number")
      .eq("id", "main")
      .maybeSingle();

    if (stateError) {
      warn("Backfill state table is not readable yet", "run supabase/phase-3h-record-backfill-state.sql");
    } else {
      pass("Backfill state table is readable");
    }

    const { error: recordsError } = await client
      .from("collatz_all_time_records")
      .select("record_category, starting_number, steps, peak_value, source")
      .eq("source", "historical_backfill")
      .limit(10);

    if (recordsError) {
      fail("Unable to query historical_backfill records", recordsError.message);
    } else {
      pass("historical_backfill permanent-record query is valid");
    }
  }

  console.log("\nSummary");
  console.log("-------");
  console.log(`Passed: ${passed}`);
  console.log(`Warned: ${warned}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[records:verify-backfill] ${message}`);
  process.exit(1);
});
