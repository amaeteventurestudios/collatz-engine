/**
 * CLI batch runner for The Collatz Engine.
 *
 * Usage:
 *   npm run collatz:batch -- <start> <end>
 *   npm run collatz:batch -- 1 10000
 */

import { runBatch } from "../lib/collatz/batch-runner";
import { formatBigInt } from "../lib/collatz/format";

const args = process.argv.slice(2);
const batchStart = parseInt(args[0] ?? "1", 10);
const batchEnd = parseInt(args[1] ?? "1000", 10);

if (isNaN(batchStart) || isNaN(batchEnd) || batchStart < 1 || batchEnd < batchStart) {
  console.error("Usage: npm run collatz:batch -- <start> <end>");
  console.error("  start must be >= 1 and end must be >= start.");
  process.exit(1);
}

console.log("\n=== Collatz Batch Runner ===");
console.log(`Range: ${batchStart.toLocaleString("en-US")} – ${batchEnd.toLocaleString("en-US")}`);
console.log("Computing…\n");

const result = runBatch({ batch_start: batchStart, batch_end: batchEnd });

if (result.stopped_reason === "error") {
  console.error("Batch failed: invalid range.");
  process.exit(1);
}

const pad = (label: string) => label.padEnd(28, " ");
const fmt = (n: number | string) =>
  typeof n === "number" ? n.toLocaleString("en-US") : n;

console.log(`${pad("Numbers tested:")}${fmt(result.numbers_tested)}`);
console.log(`${pad("Duration:")}${fmt(result.duration_ms)} ms`);
console.log(`${pad("Avg steps to 1:")}${result.avg_steps.toFixed(2)}`);
console.log();

console.log(`${pad("Max steps:")}${fmt(result.max_steps)}  (n = ${fmt(result.max_steps_number)})`);
console.log(
  `${pad("Max peak:")}${formatBigInt(BigInt(result.max_peak))}  (n = ${fmt(result.max_peak_number)})`,
);
console.log(
  `${pad("Max peak ratio:")}${result.max_peak_ratio.toFixed(2)}×  (n = ${fmt(result.max_peak_ratio_number)})`,
);

if (result.longest_first_descent_delay !== null) {
  console.log(
    `${pad("Longest first descent:")}${fmt(result.longest_first_descent_delay)} steps  (n = ${fmt(result.longest_first_descent_number!)})`,
  );
}

console.log(
  `${pad("Highest odd density:")}${(result.highest_odd_step_density * 100).toFixed(1)}%  (n = ${fmt(result.highest_odd_density_number)})`,
);
console.log();

console.log(`${pad("Near-escape candidates:")}${fmt(result.near_escape_candidates.length)}`);
console.log(`${pad("Final record holders:")}${fmt(result.record_breakers.length)}`);
console.log(`${pad("Samples saved:")}${fmt(result.trajectory_samples.length)}`);

if (result.near_escape_candidates.length > 0) {
  console.log("\nTop near-escape candidates:");
  const top = [...result.near_escape_candidates]
    .sort((a, b) => b.peak_ratio - a.peak_ratio)
    .slice(0, 5);
  for (const c of top) {
    const flags = c.flags.join(", ");
    console.log(
      `  n=${fmt(c.start_number).padStart(8)}  steps=${String(c.steps_to_1).padStart(5)}  ` +
        `ratio=${c.peak_ratio.toFixed(1)}×  [${flags}]`,
    );
  }
}

console.log("\n============================");
console.log("Note: No data written to Supabase. Local computation only.");
console.log("      Autonomous cataloging begins in Phase 5/6.\n");
