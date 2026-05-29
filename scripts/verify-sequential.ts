/**
 * Collatz Sequential Integrity Verifier
 *
 * Checks that recent activity logs and engine state do not show gaps in the
 * sequential range of processed numbers. Exits 0 if clean, 1 if gaps found.
 *
 * Repair awareness:
 *   If batch_completed logs contain anomalies (overlaps or gaps) that are
 *   fully documented in a "duplicate_worker_incident_repair" activity log
 *   entry, those anomalies are classified as REPAIRED and do NOT cause a
 *   failure. Only anomalies with NO matching repair entry fail.
 *
 *   This distinction is precise:
 *     - current_number = last_checked_number + 1 is always enforced (no exceptions).
 *     - Unrepaired gaps/overlaps always fail.
 *     - Repaired anomalies are reported but do not fail.
 *
 * Usage:
 *   npm run collatz:verify-sequential
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getEngineState, getRecentActivityLogs, getActivityLogsByEventType } =
    await import("../lib/collatz/store");
  const { analyzeSequence, extractRepairs } = await import(
    "../lib/collatz/incident-repair"
  );

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   Collatz Sequential Integrity Verifier   │");
  console.log("└──────────────────────────────────────────┘\n");

  // ── Engine state check ────────────────────────────────────────────────────
  const state = await getEngineState();
  if (!state) {
    console.error("[verify-sequential] Engine state not found. Cannot verify.\n");
    process.exit(1);
  }

  console.log(`  Engine state:`);
  console.log(`    last_checked_number  : ${state.last_checked_number.toLocaleString("en-US")}`);
  if (typeof state.current_number === "number") {
    console.log(`    current_number       : ${state.current_number.toLocaleString("en-US")}`);
    const expectedCurrentNumber = state.last_checked_number + 1;
    if (state.current_number !== expectedCurrentNumber) {
      console.error(
        `\n  [FAIL] current_number (${state.current_number.toLocaleString("en-US")}) ` +
          `!== last_checked_number + 1 (${expectedCurrentNumber.toLocaleString("en-US")})\n`,
      );
      process.exit(1);
    }
    console.log(`    current_number check : PASS (= last_checked_number + 1)`);
  }
  console.log(`    total_numbers_checked: ${state.total_numbers_checked.toLocaleString("en-US")}`);
  console.log(`    status               : ${state.current_status}\n`);

  // ── Fetch documented incident repairs ─────────────────────────────────────
  const repairLogs = await getActivityLogsByEventType("duplicate_worker_incident_repair", 20);
  const allRepairs = repairLogs.flatMap((log) =>
    log.metadata ? extractRepairs(log.metadata) : [],
  );

  if (repairLogs.length > 0) {
    console.log(
      `  Found ${repairLogs.length} documented incident repair(s) covering ${allRepairs.length} transition(s).`,
    );
    for (const log of repairLogs) {
      console.log(`    [repair] ${log.message?.slice(0, 100)}...`);
    }
    console.log();
  }

  // ── Activity log gap check ────────────────────────────────────────────────
  const logs = await getRecentActivityLogs(200);

  const completed = logs
    .filter(
      (l) =>
        l.event_type === "batch_completed" &&
        l.batch_start != null &&
        l.batch_end != null,
    )
    .sort((a, b) => (a.batch_start ?? 0) - (b.batch_start ?? 0));

  if (completed.length === 0) {
    console.log("  No batch_completed log entries found — skipping gap analysis.");
    console.log("  (Activity logging may be throttled; this is not an error.)\n");
    console.log("[verify-sequential] Result: PASS (no log data to check)\n");
    process.exit(0);
  }

  console.log(`  Analyzing ${completed.length} batch_completed log entries...\n`);

  const batchEntries = completed.map((l) => ({
    batch_start: l.batch_start!,
    batch_end: l.batch_end!,
  }));

  const analysis = analyzeSequence(batchEntries, allRepairs);

  // Report repaired anomalies (informational — not a failure)
  if (analysis.repairedAnomalies.length > 0) {
    console.log(
      `  ${analysis.repairedAnomalies.length} anomaly/anomalies covered by documented incident repair(s):`,
    );
    for (const a of analysis.repairedAnomalies) {
      const detail =
        a.type === "overlap"
          ? `overlap (${Math.abs(a.delta)} numbers)`
          : `gap of ${a.delta} numbers`;
      console.log(
        `    [repaired] prevEnd=${a.prevEnd.toLocaleString("en-US")} → ` +
          `batchStart=${a.batchStart.toLocaleString("en-US")} [${detail}]`,
      );
    }
    console.log();
  }

  // Report unrepaired anomalies (these fail)
  if (analysis.unrepairedAnomalies.length > 0) {
    for (const a of analysis.unrepairedAnomalies) {
      const detail =
        a.type === "overlap"
          ? `overlap of ${Math.abs(a.delta)} numbers`
          : `gap of ${a.delta} numbers (${(a.prevEnd + 1).toLocaleString("en-US")}–${(a.batchStart - 1).toLocaleString("en-US")} missing)`;
      console.error(
        `  [UNREPAIRED] prevEnd=${a.prevEnd.toLocaleString("en-US")} → ` +
          `batchStart=${a.batchStart.toLocaleString("en-US")} [${detail}]`,
      );
    }
    console.error(
      `\n[verify-sequential] Result: FAIL — ${analysis.unrepairedAnomalies.length} unrepaired anomaly/anomalies.\n` +
        `  Run 'npm run collatz:repair-duplicate-worker-incident' if this is from a known incident,\n` +
        `  or investigate the gap source before continuing.\n`,
    );
    process.exit(1);
  }

  const summaryLine =
    analysis.repairedAnomalies.length > 0
      ? `All ${analysis.totalBatches} logged batches are contiguous (${analysis.repairedAnomalies.length} repaired anomaly/anomalies excluded from clean count).`
      : `All ${analysis.totalBatches} logged batches are contiguous.`;

  console.log(`  ${summaryLine}\n`);
  console.log("[verify-sequential] Result: PASS\n");
  process.exit(0);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[verify-sequential] Fatal error:", message);
  process.exit(1);
});
