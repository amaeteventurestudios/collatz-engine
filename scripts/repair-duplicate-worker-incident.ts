/**
 * Collatz Duplicate-Worker Incident Repair
 *
 * Repairs the activity log damage caused by two workers processing batches
 * simultaneously on 2026-05-28. The incident left:
 *
 *   - Two overlapping batch_completed entries for 7,646,802–7,646,851
 *   - Two overlapping batch_completed entries for 7,646,852–7,646,901
 *   - A missing batch_completed log for 7,647,052–7,647,101 (50 numbers)
 *
 * This script:
 *   1. Confirms engine is paused and no active lock exists.
 *   2. Fetches batch_completed logs in the incident range.
 *   3. Detects overlapping/duplicate transitions and the gap.
 *   4. Backfills collatz_results for the missing 50 numbers.
 *   5. Writes a canonical "duplicate_worker_incident_repair" activity log entry.
 *   6. Is idempotent: aborts if a repair log already exists.
 *
 * The sequential verifier recognises this repair log and passes if all
 * anomalies in the incident window are covered.
 *
 * Usage:
 *   npm run collatz:repair-duplicate-worker-incident
 *
 * Safety:
 *   - Engine must be paused.
 *   - No active production worker lock may exist.
 *   - Does NOT reset engine state or last_checked_number.
 *   - Does NOT delete any log entries.
 */

import { loadEnvConfig } from "@next/env";
import type { RepairedTransition } from "../lib/collatz/incident-repair";

loadEnvConfig(process.cwd());

// ── Incident constants ────────────────────────────────────────────────────────
// These are the known parameters of the 2026-05-28 duplicate-worker incident.

const INCIDENT_DATE = "2026-05-28";

// Fetch window: grab logs slightly wider than the incident range so we can
// confirm the sequence before and after.
const FETCH_START = 7_646_752;
const FETCH_END   = 7_647_201;

// Expected anomalous transitions (verified from incident analysis)
const EXPECTED_TRANSITIONS = [
  { prev_end: 7_646_851, batch_start: 7_646_802 },
  { prev_end: 7_646_901, batch_start: 7_646_852 },
  { prev_end: 7_647_051, batch_start: 7_647_102 },
] as const;

// The missing gap that must be backfilled
const MISSING_GAP_START = 7_647_052;
const MISSING_GAP_END   = 7_647_101;

const REPAIR_EVENT_TYPE = "duplicate_worker_incident_repair";
const SCRIPT_NAME = "scripts/repair-duplicate-worker-incident.ts";

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { getEngineState, getBatchCompletedLogsInRange, getActivityLogsByEventType, insertActivityLog, insertBatchResults } =
    await import("../lib/collatz/store");
  const { getActiveLock } = await import("../lib/collatz/worker-lock");
  const { analyzeSequence, findGapRanges } =
    await import("../lib/collatz/incident-repair");
  const { computeCollatzSummary } = await import("../lib/collatz/engine");

  console.log("\n┌──────────────────────────────────────────────────────┐");
  console.log("│   Collatz Duplicate-Worker Incident Repair            │");
  console.log("└──────────────────────────────────────────────────────┘\n");

  // ── 1. Idempotency check: abort if repair already done ────────────────────
  const existingRepairs = await getActivityLogsByEventType(REPAIR_EVENT_TYPE, 5);
  if (existingRepairs.length > 0) {
    console.log(`  [INFO] A repair log already exists (${existingRepairs.length} entry/entries found).`);
    console.log(`  Repair was previously completed at: ${existingRepairs[0].created_at}`);
    console.log(`  Run 'npm run collatz:verify-sequential' to confirm the verifier passes.`);
    console.log("\n  Nothing to do — exiting cleanly.\n");
    process.exit(0);
  }

  // ── 2. Safety check: engine must be paused ────────────────────────────────
  const state = await getEngineState();
  if (!state) {
    console.error("  [FAIL] Engine state not found. Cannot repair without engine state.\n");
    process.exit(1);
  }

  console.log(`  Engine state:`);
  console.log(`    status              : ${state.current_status}`);
  console.log(`    last_checked_number : ${state.last_checked_number.toLocaleString("en-US")}`);
  console.log(`    current_number      : ${state.current_number?.toLocaleString("en-US") ?? "—"}`);

  if (state.current_status !== "paused") {
    console.error(
      `\n  [FAIL] Engine is "${state.current_status}" — must be paused before repair.\n` +
        `  Pause the engine from the admin dashboard first.\n`,
    );
    process.exit(1);
  }
  console.log(`    status check        : PASS (paused)\n`);

  // ── 3. Safety check: no active production worker lock ────────────────────
  const activeLock = await getActiveLock("primary");
  if (activeLock) {
    console.error(
      `\n  [FAIL] Active worker lock found (instance: ${activeLock.worker_instance_id}).\n` +
        `  Stop the running worker before repairing. Expires: ${activeLock.expires_at}\n`,
    );
    process.exit(1);
  }
  console.log(`  Worker lock check : PASS (no active lock)\n`);

  // ── 4. Fetch batch_completed logs in the incident range ───────────────────
  console.log(`  Fetching batch_completed logs in range ${FETCH_START.toLocaleString("en-US")}–${FETCH_END.toLocaleString("en-US")}...`);

  const incidentLogs = await getBatchCompletedLogsInRange(FETCH_START, FETCH_END, 200);
  const batchEntries = incidentLogs
    .filter((l) => l.batch_start != null && l.batch_end != null)
    .map((l) => ({ batch_start: l.batch_start!, batch_end: l.batch_end! }));

  console.log(`  Found ${batchEntries.length} batch_completed entries in range.\n`);

  if (batchEntries.length === 0) {
    console.error("  [FAIL] No batch_completed logs found in the incident range.\n");
    process.exit(1);
  }

  // ── 5. Analyze the sequence ───────────────────────────────────────────────
  const analysis = analyzeSequence(batchEntries, []); // no repairs yet
  const gaps = findGapRanges(batchEntries);

  console.log(`  Sequence analysis (${batchEntries.length} entries):`);
  console.log(`    Unrepaired anomalies : ${analysis.unrepairedAnomalies.length}`);

  for (const a of analysis.unrepairedAnomalies) {
    const detail =
      a.type === "overlap"
        ? `overlap (delta ${a.delta})`
        : `gap of ${a.delta} numbers (${(a.prevEnd + 1).toLocaleString("en-US")}–${(a.batchStart - 1).toLocaleString("en-US")})`;
    console.log(
      `      prevEnd=${a.prevEnd.toLocaleString("en-US")} → batchStart=${a.batchStart.toLocaleString("en-US")} [${detail}]`,
    );
  }

  if (analysis.unrepairedAnomalies.length === 0) {
    console.log("\n  No anomalies detected in the incident range.");
    console.log("  The logs appear clean — no repair needed.\n");
    process.exit(0);
  }

  // ── 6. Verify the anomalies match the expected incident pattern ───────────
  console.log(`\n  Verifying anomalies match expected incident pattern...`);

  const foundTransitions = analysis.unrepairedAnomalies.map((a) => ({
    prev_end: a.prevEnd,
    batch_start: a.batchStart,
  }));

  let patternMismatch = false;

  for (const expected of EXPECTED_TRANSITIONS) {
    const found = foundTransitions.some(
      (f) => f.prev_end === expected.prev_end && f.batch_start === expected.batch_start,
    );
    if (found) {
      console.log(
        `    FOUND    prevEnd=${expected.prev_end.toLocaleString("en-US")} → batchStart=${expected.batch_start.toLocaleString("en-US")}`,
      );
    } else {
      console.warn(
        `    MISSING  prevEnd=${expected.prev_end.toLocaleString("en-US")} → batchStart=${expected.batch_start.toLocaleString("en-US")} (not found in logs)`,
      );
      patternMismatch = true;
    }
  }

  for (const found of foundTransitions) {
    const expected = EXPECTED_TRANSITIONS.find(
      (e) => e.prev_end === found.prev_end && e.batch_start === found.batch_start,
    );
    if (!expected) {
      console.warn(
        `    EXTRA    prevEnd=${found.prev_end.toLocaleString("en-US")} → batchStart=${found.batch_start.toLocaleString("en-US")} (unexpected anomaly)`,
      );
      patternMismatch = true;
    }
  }

  if (patternMismatch) {
    console.error(
      "\n  [WARN] Anomaly pattern does not fully match the expected incident.\n" +
        "  Proceeding with repair of ALL found anomalies.\n",
    );
  } else {
    console.log("  Pattern match: PASS\n");
  }

  // ── 7. Backfill missing gap in collatz_results ────────────────────────────
  const backfillResults: Array<{ n: number; missing: boolean }> = [];
  let backfilledCount = 0;

  if (gaps.length > 0) {
    for (const gap of gaps) {
      console.log(
        `  Backfilling missing range: ${gap.gapStart.toLocaleString("en-US")}–${gap.gapEnd.toLocaleString("en-US")} (${gap.gapEnd - gap.gapStart + 1} numbers)`,
      );

      const rows = [];
      for (let n = gap.gapStart; n <= gap.gapEnd; n++) {
        const summary = computeCollatzSummary(n);
        rows.push({
          n,
          steps: summary.steps_to_1,
          peak: Number(summary.peak_value),
          reached_one: summary.reached_one,
        });
        backfillResults.push({ n, missing: true });
      }

      await insertBatchResults(rows);
      backfilledCount += rows.length;
      console.log(`  Backfilled ${rows.length} numbers into collatz_results (upsert).`);
    }
  } else {
    console.log("  No gap ranges found — no backfill needed.");
  }

  // ── 8. Write the canonical repair activity log ────────────────────────────
  const repairedAt = new Date().toISOString();

  const repairedTransitions: RepairedTransition[] = [];

  for (const a of analysis.unrepairedAnomalies) {
    if (a.type === "overlap") {
      repairedTransitions.push({
        prev_end: a.prevEnd,
        batch_start: a.batchStart,
        type: "overlap",
        action: "documented",
      });
    } else {
      // gap
      repairedTransitions.push({
        prev_end: a.prevEnd,
        batch_start: a.batchStart,
        type: "gap",
        gap_start: a.prevEnd + 1,
        gap_end: a.batchStart - 1,
        action: "backfilled",
      });
    }
  }

  const repairMessage =
    `Duplicate-worker incident repair (${INCIDENT_DATE}): ` +
    `${analysis.unrepairedAnomalies.filter((a) => a.type === "overlap").length} overlapping range(s) documented, ` +
    `${gaps.length > 0 ? `missing range ${MISSING_GAP_START.toLocaleString("en-US")}–${MISSING_GAP_END.toLocaleString("en-US")} backfilled (${backfilledCount} numbers)` : "no gap backfill needed"}. ` +
    `Engine state preserved. Script: ${SCRIPT_NAME}.`;

  await insertActivityLog({
    event_type: REPAIR_EVENT_TYPE,
    message: repairMessage,
    batch_start: FETCH_START,
    batch_end: FETCH_END,
    numbers_processed: backfilledCount,
    metadata: {
      script: SCRIPT_NAME,
      repaired_at: repairedAt,
      incident_date: INCIDENT_DATE,
      incident_summary:
        "Two workers (local iMac batch-50 and Hetzner batch-100) ran simultaneously. " +
        "Both started at batch_start 7,646,802. Overlapping writes and a missing range resulted. " +
        "Resolved by Phase 2B worker lock (commit a2f331d).",
      repaired_transitions: repairedTransitions,
      backfilled_count: backfilledCount,
      backfilled_ranges: gaps.map((g) => ({
        gap_start: g.gapStart,
        gap_end: g.gapEnd,
        count: g.gapEnd - g.gapStart + 1,
      })),
    },
  });

  console.log(`\n  Repair activity log written.`);
  console.log(`  Event type : ${REPAIR_EVENT_TYPE}`);
  console.log(`  Message    : ${repairMessage}`);

  // ── 9. Summary ────────────────────────────────────────────────────────────
  console.log("\n  ─────────────────────────────────────────────────────");
  console.log("  Repair complete.\n");
  console.log(`    Overlapping transitions documented : ${repairedTransitions.filter((r) => r.type === "overlap").length}`);
  console.log(`    Gap transitions documented         : ${repairedTransitions.filter((r) => r.type === "gap").length}`);
  console.log(`    Numbers backfilled                 : ${backfilledCount}`);
  console.log(`    Engine state                       : unchanged (paused)`);
  console.log(`    Repair log written                 : yes\n`);
  console.log("  Run 'npm run collatz:verify-sequential' to confirm the verifier now passes.\n");

  process.exit(0);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[repair-duplicate-worker-incident] Fatal error:", message);
  process.exit(1);
});
