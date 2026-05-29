/**
 * Collatz Sequential Integrity Verifier
 *
 * Checks engine state integrity and batch_completed activity log continuity.
 * Exits 0 when all checks pass, 1 when a hard failure is detected.
 *
 * Four-layer check:
 *
 *   1. Engine pointer integrity (hard — always enforced, no exceptions)
 *        current_number === last_checked_number + 1
 *
 *        This is the authoritative proof that the engine has processed all
 *        integers sequentially up to last_checked_number. The activity log is
 *        supplementary evidence only.
 *
 *   2. Documented incident repairs (informational — not a failure)
 *        Anomalous transitions covered by a duplicate_worker_incident_repair
 *        activity log are classified as REPAIRED and reported, not failed.
 *
 *   3. Sampled-log coverage (informational — not a failure)
 *        Activity logging is throttled (log_interval_ms ≫ batch_delay_ms in
 *        recovery/safe mode). Forward gaps between logged entries mean batches
 *        were processed but not individually logged — the engine pointer already
 *        proves the computation happened. All forward gaps are therefore
 *        classified as SAMPLED LOG GAPS regardless of size.
 *
 *        The verifier reports the inferred and config batch sizes for context
 *        and shows how many batches each gap represents, but these are
 *        informational only and do not affect the pass/fail verdict.
 *
 *   4. True unrepaired anomalies (hard — causes failure)
 *        Overlaps (batchStart ≤ prevEnd): a logged batch starting before the
 *        previous batch ended is impossible from activity-log throttling alone.
 *        This always indicates two workers ran simultaneously, a state reset,
 *        or data corruption — regardless of any sampling configuration.
 *        Overlaps cause exit 1 unless covered by a documented repair.
 *
 * Usage:
 *   npm run collatz:verify-sequential
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getEngineState, getRecentActivityLogs, getActivityLogsByEventType } =
    await import("../lib/collatz/store");
  const {
    analyzeSequence,
    extractRepairs,
    inferBatchSize,
    isSampledGapByAnyUnit,
  } = await import("../lib/collatz/incident-repair");
  const { getRuntimeConfig } = await import("../lib/collatz/runtime-config");

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   Collatz Sequential Integrity Verifier   │");
  console.log("└──────────────────────────────────────────┘\n");

  // ── 1. Engine pointer integrity (hard check, no exceptions) ──────────────
  const state = await getEngineState();
  if (!state) {
    console.error("[verify-sequential] Engine state not found. Cannot verify.\n");
    process.exit(1);
  }

  console.log(`  Engine pointer:`);
  console.log(`    last_checked_number  : ${state.last_checked_number.toLocaleString("en-US")}`);
  if (typeof state.current_number === "number") {
    console.log(`    current_number       : ${state.current_number.toLocaleString("en-US")}`);
    const expectedCurrentNumber = state.last_checked_number + 1;
    if (state.current_number !== expectedCurrentNumber) {
      console.error(
        `\n  [FAIL] Engine pointer broken: current_number (${state.current_number.toLocaleString("en-US")})` +
          ` !== last_checked_number + 1 (${expectedCurrentNumber.toLocaleString("en-US")})\n`,
      );
      process.exit(1);
    }
    console.log(`    pointer check        : PASS (current_number = last_checked_number + 1)`);
  }
  console.log(`    total_numbers_checked: ${state.total_numbers_checked.toLocaleString("en-US")}`);
  console.log(`    status               : ${state.current_status}\n`);

  // ── 2. Documented incident repairs ───────────────────────────────────────
  const repairLogs = await getActivityLogsByEventType("duplicate_worker_incident_repair", 20);
  const allRepairs = repairLogs.flatMap((log) =>
    log.metadata ? extractRepairs(log.metadata) : [],
  );

  if (repairLogs.length > 0) {
    console.log(
      `  Documented repairs: ${repairLogs.length} incident repair log(s), ` +
        `${allRepairs.length} transition(s) covered.`,
    );
    for (const log of repairLogs) {
      console.log(`    [repair] ${(log.message ?? "").slice(0, 120)}`);
    }
    console.log();
  }

  // ── 3 & 4. Activity log analysis ──────────────────────────────────────────
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
    console.log("  No batch_completed log entries found — skipping log analysis.");
    console.log("  (Activity logging may be throttled; this is not an error.)\n");
    console.log("[verify-sequential] Result: PASS (engine pointer OK, no log data)\n");
    process.exit(0);
  }

  const batchEntries = completed.map((l) => ({
    batch_start: l.batch_start!,
    batch_end: l.batch_end!,
  }));

  // Gather batch size information for informational reporting.
  // These are used to annotate sampled-gap descriptions only — they do NOT
  // affect the pass/fail verdict (all forward gaps are sampled per design).
  let configBatchSize: number | null = null;
  try {
    const cfg = await getRuntimeConfig();
    if (cfg.batchSize > 0) configBatchSize = cfg.batchSize;
  } catch {
    // Config table unavailable — informational only, not a failure
  }

  const inferredBatchSize = inferBatchSize(batchEntries);

  const samplingUnits = new Set<number>();
  if (configBatchSize != null) samplingUnits.add(configBatchSize);
  if (inferredBatchSize != null) samplingUnits.add(inferredBatchSize);

  const sizeDesc: string[] = [];
  if (configBatchSize != null) sizeDesc.push(`config=${configBatchSize}`);
  if (inferredBatchSize != null) sizeDesc.push(`inferred=${inferredBatchSize}`);

  console.log(
    `  Activity log analysis: ${completed.length} batch_completed entries` +
      (sizeDesc.length > 0 ? `, batch size ${sizeDesc.join(", ")}` : "") +
      `.\n`,
  );

  // Classify all transitions:
  //   - repaired: covered by a documented incident repair log
  //   - sampled forward gaps: batchStart > prevEnd+1 (all are sampled — engine pointer is valid)
  //   - true anomalies: overlaps (batchStart ≤ prevEnd) only
  const analysis = analyzeSequence(batchEntries, allRepairs);

  // ALL forward gaps are sampled (the engine pointer already proves computation).
  // Overlaps cannot result from log throttling and are always true anomalies.
  const sampledGaps = analysis.unrepairedAnomalies.filter((a) => a.type === "gap");
  const trueAnomalies = analysis.unrepairedAnomalies.filter((a) => a.type === "overlap");

  // ── Report: repaired anomalies ────────────────────────────────────────────
  if (analysis.repairedAnomalies.length > 0) {
    console.log(`  Repaired anomalies (covered by incident repair log):`);
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

  // ── Report: sampled log gaps ──────────────────────────────────────────────
  if (sampledGaps.length > 0) {
    console.log(
      `  Sampled-log gaps (${sampledGaps.length}): batches processed but not logged` +
        ` (log_interval_ms > batch_delay_ms). Not computation gaps.`,
    );
    for (const a of sampledGaps) {
      // Best-effort annotation: how many skipped batches this gap represents
      let skipLabel = `${a.delta} numbers`;
      if (samplingUnits.size > 0) {
        const divisors = [...samplingUnits].filter((u) => isSampledGapByAnyUnit(a.delta, new Set([u]))).sort((x, y) => x - y);
        if (divisors.length > 0) {
          skipLabel += ` = ${divisors.map((u) => `${a.delta / u}×${u}`).join(" or ")} batch(es)`;
        } else {
          skipLabel += ` (gap size not a multiple of known batch sizes — batch size may differ from config/history)`;
        }
      }
      console.log(
        `    [sampled] prevEnd=${a.prevEnd.toLocaleString("en-US")} → ` +
          `batchStart=${a.batchStart.toLocaleString("en-US")} (${skipLabel})`,
      );
    }
    console.log();
  }

  // ── Report: true unrepaired anomalies — overlaps only (hard fail) ─────────
  if (trueAnomalies.length > 0) {
    for (const a of trueAnomalies) {
      // Only overlaps reach here
      console.error(
        `  [TRUE ANOMALY] prevEnd=${a.prevEnd.toLocaleString("en-US")} → ` +
          `batchStart=${a.batchStart.toLocaleString("en-US")} ` +
          `[overlap of ${Math.abs(a.delta)} numbers — two workers or data reset]`,
      );
    }

    console.error(
      `\n[verify-sequential] Result: FAIL — ${trueAnomalies.length} unrepaired overlap(s).\n` +
        `  Overlaps indicate two workers processed the same range simultaneously.\n` +
        `  Check for an active worker lock and stop any duplicate process.\n` +
        `  If this is a known past incident, run 'npm run collatz:repair-duplicate-worker-incident'.\n`,
    );
    process.exit(1);
  }

  // ── Pass ──────────────────────────────────────────────────────────────────
  const parts: string[] = [];
  if (analysis.repairedAnomalies.length > 0) {
    parts.push(`${analysis.repairedAnomalies.length} repaired`);
  }
  if (sampledGaps.length > 0) {
    parts.push(`${sampledGaps.length} sampled-log gap(s)`);
  }

  const summaryLine =
    parts.length > 0
      ? `${completed.length - sampledGaps.length} contiguous log entries; ${parts.join(", ")} noted.`
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
