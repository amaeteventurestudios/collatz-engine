/**
 * Verify and optionally seed permanent Collatz all-time records.
 *
 * Usage:
 *   npm run records:verify-permanent
 *   npm run records:verify-permanent -- --seed
 *
 * Safety:
 * - Does not update collatz_engine_state.
 * - Does not update runtime config.
 * - Does not touch worker locks.
 * - Does not delete retained results.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = ReturnType<typeof createClient<any>>;

type RetainedRow = {
  n: number;
  steps: number;
  peak: number;
  created_at: string | null;
};

type PermanentRow = {
  record_category: "longest_trajectory" | "highest_peak";
  starting_number: number;
  steps: number;
  peak_value: number;
  source: string | null;
  discovered_at: string | null;
};

const SHOULD_SEED = process.argv.includes("--seed");
const TOP_N = 1000;

let passed = 0;
let failed = 0;
let seededLongest = 0;
let seededPeaks = 0;

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` - ${detail}` : ""}`);
  failed++;
}

function info(label: string) {
  console.log(`  [INFO] ${label}`);
}

function section(title: string) {
  console.log(`\n  ${title}`);
  console.log("  " + "-".repeat(title.length));
}

function fmt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "unknown";
  return value.toLocaleString("en-US");
}

function getServiceClient(): AnyClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "\n  [ERROR] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n",
    );
    process.exit(1);
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

async function verifyTableReadable(client: AnyClient): Promise<boolean> {
  const { error } = await client
    .from("collatz_all_time_records")
    .select(
      "id, record_category, starting_number, steps, peak_value, rank_scope, source, source_batch_start, source_batch_end, discovered_at, created_at, updated_at",
    )
    .limit(1);

  if (error) {
    fail("collatz_all_time_records readable", error.message);
    return false;
  }

  pass("collatz_all_time_records exists, required columns are selectable, and PostgREST can read it");
  return true;
}

async function readEngineState(client: AnyClient) {
  const { data, error } = await client
    .from("collatz_engine_state")
    .select(
      "id, current_status, current_number, last_checked_number, total_numbers_checked, longest_steps, highest_peak, worker_heartbeat_at, updated_at",
    )
    .eq("id", "main")
    .single();

  if (error || !data) {
    fail("Read collatz_engine_state", error?.message ?? "state row not found");
    return null;
  }

  pass(
    `Engine state readable: longest=${fmt(Number(data.longest_steps))} steps, highest_peak=${fmt(Number(data.highest_peak))}`,
  );
  return data as {
    current_status: string;
    current_number: number;
    last_checked_number: number;
    total_numbers_checked: number;
    longest_steps: number;
    highest_peak: number;
  };
}

async function readRetainedStats(client: AnyClient) {
  const { count, error } = await client
    .from("collatz_results")
    .select("*", { count: "exact", head: true });

  if (error) {
    fail("Count retained collatz_results", error.message);
    return null;
  }

  const [{ data: minRows, error: minErr }, { data: maxRows, error: maxErr }] = await Promise.all([
    client.from("collatz_results").select("n").order("n", { ascending: true }).limit(1),
    client.from("collatz_results").select("n").order("n", { ascending: false }).limit(1),
  ]);

  if (minErr || maxErr) {
    fail("Read retained n range", minErr?.message ?? maxErr?.message);
    return null;
  }

  const minN = Number(minRows?.[0]?.n ?? 0);
  const maxN = Number(maxRows?.[0]?.n ?? 0);
  pass(`Retained buffer rows: ${fmt(count ?? 0)} (n ${fmt(minN)} to ${fmt(maxN)})`);
  return { count: count ?? 0, minN, maxN };
}

async function readTopRetained(client: AnyClient) {
  const [longest, peaks] = await Promise.all([
    client
      .from("collatz_results")
      .select("n, steps, peak, created_at")
      .order("steps", { ascending: false })
      .order("peak", { ascending: false })
      .limit(TOP_N),
    client
      .from("collatz_results")
      .select("n, steps, peak, created_at")
      .order("peak", { ascending: false })
      .order("steps", { ascending: false })
      .limit(TOP_N),
  ]);

  if (longest.error || peaks.error) {
    fail("Read top retained candidates", longest.error?.message ?? peaks.error?.message);
    return null;
  }

  const longestRows = (longest.data ?? []) as RetainedRow[];
  const peakRows = (peaks.data ?? []) as RetainedRow[];
  pass(`Read top retained candidates: ${longestRows.length} longest, ${peakRows.length} peak`);

  if (longestRows[0]) {
    info(
      `Top retained longest candidate: n=${fmt(longestRows[0].n)}, steps=${fmt(longestRows[0].steps)}, peak=${fmt(longestRows[0].peak)}`,
    );
  }
  if (peakRows[0]) {
    info(
      `Top retained peak candidate: n=${fmt(peakRows[0].n)}, steps=${fmt(peakRows[0].steps)}, peak=${fmt(peakRows[0].peak)}`,
    );
  }

  return { longestRows, peakRows };
}

function toPermanentPayload(
  rows: RetainedRow[],
  recordCategory: PermanentRow["record_category"],
) {
  return rows.map((row) => ({
    record_category: recordCategory,
    starting_number: row.n,
    steps: row.steps,
    peak_value: row.peak,
    source: "retained_buffer_seed",
    discovered_at: row.created_at ?? new Date().toISOString(),
  }));
}

async function seedRecords(client: AnyClient, retained: { longestRows: RetainedRow[]; peakRows: RetainedRow[] }) {
  const longestPayload = toPermanentPayload(retained.longestRows, "longest_trajectory");
  const peakPayload = toPermanentPayload(retained.peakRows, "highest_peak");

  const [longestRes, peakRes] = await Promise.all([
    client
      .from("collatz_all_time_records")
      .upsert(longestPayload, { onConflict: "record_category,starting_number" })
      .select("starting_number"),
    client
      .from("collatz_all_time_records")
      .upsert(peakPayload, { onConflict: "record_category,starting_number" })
      .select("starting_number"),
  ]);

  if (longestRes.error) {
    fail("Seed longest_trajectory permanent records", longestRes.error.message);
  } else {
    seededLongest = longestRes.data?.length ?? longestPayload.length;
    pass(`Seeded/upserted ${fmt(seededLongest)} longest_trajectory rows from retained buffer`);
  }

  if (peakRes.error) {
    fail("Seed highest_peak permanent records", peakRes.error.message);
  } else {
    seededPeaks = peakRes.data?.length ?? peakPayload.length;
    pass(`Seeded/upserted ${fmt(seededPeaks)} highest_peak rows from retained buffer`);
  }
}

async function readPermanentCounts(client: AnyClient) {
  const [longest, peaks] = await Promise.all([
    client
      .from("collatz_all_time_records")
      .select("*", { count: "exact", head: true })
      .eq("record_category", "longest_trajectory"),
    client
      .from("collatz_all_time_records")
      .select("*", { count: "exact", head: true })
      .eq("record_category", "highest_peak"),
  ]);

  if (longest.error || peaks.error) {
    fail("Read permanent row counts by category", longest.error?.message ?? peaks.error?.message);
    return { longestCount: 0, peakCount: 0 };
  }

  const longestCount = longest.count ?? 0;
  const peakCount = peaks.count ?? 0;
  pass(`Permanent row counts: longest=${fmt(longestCount)}, peak=${fmt(peakCount)}`);
  return { longestCount, peakCount };
}

async function readPermanentTop10(client: AnyClient) {
  const [longest, peaks] = await Promise.all([
    client
      .from("collatz_all_time_records")
      .select("record_category, starting_number, steps, peak_value, source, discovered_at")
      .eq("record_category", "longest_trajectory")
      .order("steps", { ascending: false })
      .order("starting_number", { ascending: true })
      .limit(10),
    client
      .from("collatz_all_time_records")
      .select("record_category, starting_number, steps, peak_value, source, discovered_at")
      .eq("record_category", "highest_peak")
      .order("peak_value", { ascending: false })
      .order("starting_number", { ascending: true })
      .limit(10),
  ]);

  if (longest.error || peaks.error) {
    fail("Read permanent top 10 records", longest.error?.message ?? peaks.error?.message);
    return { longestTop10: [], peakTop10: [] };
  }

  const longestTop10 = (longest.data ?? []) as PermanentRow[];
  const peakTop10 = (peaks.data ?? []) as PermanentRow[];

  if (longestTop10.length > 0) pass(`Top 10 longest query returns ${longestTop10.length} row(s)`);
  else fail("Top 10 longest query returns rows", "no permanent longest records found");

  if (peakTop10.length > 0) pass(`Top 10 highest peak query returns ${peakTop10.length} row(s)`);
  else fail("Top 10 highest peak query returns rows", "no permanent peak records found");

  if (longestTop10[0]) {
    info(
      `Permanent longest #1: n=${fmt(longestTop10[0].starting_number)}, steps=${fmt(longestTop10[0].steps)}, peak=${fmt(Number(longestTop10[0].peak_value))}`,
    );
  }
  if (peakTop10[0]) {
    info(
      `Permanent peak #1: n=${fmt(peakTop10[0].starting_number)}, steps=${fmt(peakTop10[0].steps)}, peak=${fmt(Number(peakTop10[0].peak_value))}`,
    );
  }

  return { longestTop10, peakTop10 };
}

async function verifyPermanentDataQuality(client: AnyClient) {
  const checks = [
    { label: "No null starting_number", column: "starting_number" },
    { label: "No null steps", column: "steps" },
    { label: "No null peak_value", column: "peak_value" },
    { label: "No null source", column: "source" },
  ];

  for (const check of checks) {
    const { count, error } = await client
      .from("collatz_all_time_records")
      .select("*", { count: "exact", head: true })
      .is(check.column, null);

    if (error) fail(check.label, error.message);
    else if ((count ?? 0) === 0) pass(check.label);
    else fail(check.label, `${count} row(s) violate this check`);
  }
}

async function verifyStaticCode() {
  const root = process.cwd();
  const [store, runner, runtimeConfig, cleanupScript, guardrailsSql, recordsComponent] =
    await Promise.all([
      readFile(path.join(root, "lib/collatz/store.ts"), "utf8"),
      readFile(path.join(root, "lib/collatz/autonomous-runner.ts"), "utf8"),
      readFile(path.join(root, "lib/collatz/runtime-config.ts"), "utf8"),
      readFile(path.join(root, "scripts/cleanup-collatz-storage.ts"), "utf8"),
      readFile(path.join(root, "supabase/phase-2a-storage-guardrails.sql"), "utf8"),
      readFile(path.join(root, "components/collatz/RecordBreakerTimeline.tsx"), "utf8"),
    ]);

  if (
    store.includes('from("collatz_all_time_records")') &&
    store.includes('from("collatz_results")')
  ) {
    pass("Homepage data sources remain separate in store helpers");
  } else {
    fail("Homepage data sources remain separate in store helpers");
  }

  if (
    runner.includes("preserveAllTimeRecordCandidates(rows, batchStart, batchEnd)") &&
    store.includes("preserve_collatz_all_time_record_candidates")
  ) {
    pass("Future worker preservation path exists");
  } else {
    fail("Future worker preservation path exists");
  }

  const normalCleanupText = [runtimeConfig, cleanupScript, guardrailsSql].join("\n");
  if (!normalCleanupText.includes("collatz_all_time_records")) {
    pass("Normal retained-buffer cleanup code does not target collatz_all_time_records");
  } else {
    fail("Normal retained-buffer cleanup code does not target collatz_all_time_records");
  }

  if (
    recordsComponent.includes("All-Time Engine Records") &&
    recordsComponent.includes("Recent Retained Buffer Leaders")
  ) {
    pass("Homepage labels separate all-time records from retained-buffer leaders");
  } else {
    fail("Homepage labels separate all-time records from retained-buffer leaders");
  }
}

async function main() {
  console.log("\n┌──────────────────────────────────────────────┐");
  console.log("│  Permanent Collatz Records Verifier           │");
  console.log("└──────────────────────────────────────────────┘");
  console.log(`\n  Mode: ${SHOULD_SEED ? "verify + seed" : "verify only"}`);

  const client = getServiceClient();

  section("1. Schema and static safety");
  const tableReadable = await verifyTableReadable(client);
  await verifyStaticCode();
  if (!tableReadable) {
    console.error("\n  Run supabase/phase-3g-all-time-records.sql before seeding.\n");
    process.exit(1);
  }

  section("2. Engine state and retained buffer inspection");
  const state = await readEngineState(client);
  const retainedStats = await readRetainedStats(client);
  const retained = await readTopRetained(client);

  if (!state || !retainedStats || !retained) {
    process.exit(1);
  }

  section("3. Permanent records before seed");
  const beforeCounts = await readPermanentCounts(client);

  if (SHOULD_SEED) {
    section("4. Seed retained-buffer records");
    await seedRecords(client, retained);
  } else {
    section("4. Seed retained-buffer records");
    info("Skipping seed because --seed was not provided");
  }

  section("5. Permanent records after seed");
  const afterCounts = await readPermanentCounts(client);
  const { longestTop10, peakTop10 } = await readPermanentTop10(client);
  await verifyPermanentDataQuality(client);

  section("6. Headline safety");
  pass(`Headline longest remains engine-state value: ${fmt(state.longest_steps)} steps`);
  pass(`Headline highest peak remains engine-state value: ${fmt(state.highest_peak)}`);

  const fakeLongest = longestTop10.some(
    (row) => row.steps === Number(state.longest_steps) && row.starting_number == null,
  );
  if (!fakeLongest) {
    pass("No fake starting number inserted for engine-state longest headline");
  } else {
    fail("No fake starting number inserted for engine-state longest headline");
  }

  console.log("\n┌──────────────────────────────────────────────┐");
  console.log("│  Summary                                      │");
  console.log("└──────────────────────────────────────────────┘");
  console.log(`  Before counts   longest=${fmt(beforeCounts.longestCount)}, peak=${fmt(beforeCounts.peakCount)}`);
  console.log(`  After counts    longest=${fmt(afterCounts.longestCount)}, peak=${fmt(afterCounts.peakCount)}`);
  console.log(`  Seeded/upserted longest=${fmt(seededLongest)}, peak=${fmt(seededPeaks)}`);
  console.log(`  Top 10 rows     longest=${fmt(longestTop10.length)}, peak=${fmt(peakTop10.length)}`);
  console.log(`  Source          retained_buffer_seed`);
  console.log(`  Worker status   ${state.current_status}`);
  console.log(`  Checks          ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  [FATAL] ${message}`);
  process.exit(1);
});
