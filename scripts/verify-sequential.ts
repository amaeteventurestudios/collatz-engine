/**
 * Collatz Sequential Integrity Verifier
 *
 * Checks that recent activity logs and engine state do not show gaps in the
 * sequential range of processed numbers. Exits 0 if clean, 1 if gaps found.
 *
 * Usage:
 *   npm run collatz:verify-sequential
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { getEngineState, getRecentActivityLogs } = await import(
    "../lib/collatz/store"
  );

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   Collatz Sequential Integrity Verifier   │");
  console.log("└──────────────────────────────────────────┘\n");

  // ── Engine state check ───────────────────────────────────────────────────
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

  // ── Activity log gap check ────────────────────────────────────────────────
  const logs = await getRecentActivityLogs(200);
  const batchLogs = logs
    .filter(
      (l) =>
        (l.event_type === "batch_completed" || l.event_type === "batch_started") &&
        l.batch_start != null &&
        l.batch_end != null,
    )
    .sort((a, b) => {
      // Sort ascending by batch_start for gap analysis
      return (a.batch_start ?? 0) - (b.batch_start ?? 0);
    });

  // Keep only batch_completed entries (deduplicate started/completed pairs)
  const completed = batchLogs.filter((l) => l.event_type === "batch_completed");

  if (completed.length === 0) {
    console.log("  No batch_completed log entries found — skipping gap analysis.");
    console.log("  (Activity logging may be throttled; this is not an error.)\n");
    console.log("[verify-sequential] Result: PASS (no log data to check)\n");
    process.exit(0);
  }

  console.log(`  Analyzing ${completed.length} batch_completed log entries...\n`);

  let gapsFound = 0;
  let prevEnd: number | null = null;

  for (const entry of completed) {
    const start = entry.batch_start!;
    const end = entry.batch_end!;

    if (prevEnd !== null) {
      const expectedStart = prevEnd + 1;
      if (start !== expectedStart) {
        const gap = start - expectedStart;
        console.error(
          `  [GAP] batch_end=${prevEnd.toLocaleString("en-US")} → ` +
            `batch_start=${start.toLocaleString("en-US")} ` +
            `(gap of ${gap.toLocaleString("en-US")} numbers, ` +
            `expected start=${expectedStart.toLocaleString("en-US")})`,
        );
        gapsFound++;
      }
    }
    prevEnd = end;
  }

  if (gapsFound === 0) {
    console.log(`  All ${completed.length} logged batches are contiguous.\n`);
    console.log("[verify-sequential] Result: PASS\n");
    process.exit(0);
  } else {
    console.error(
      `\n[verify-sequential] Result: FAIL — ${gapsFound} gap(s) detected in recent logs.\n` +
        `  This means numbers were skipped. Check admin panel and worker logs.\n`,
    );
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[verify-sequential] Fatal error:", message);
  process.exit(1);
});
