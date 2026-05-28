/**
 * Collatz Continuous Worker
 *
 * Runs batches in a tight loop until the engine status is no longer "running"
 * or the process receives SIGINT / SIGTERM (Ctrl+C).
 *
 * Usage:
 *   npm run collatz:worker                    # uses env-var defaults
 *   npm run collatz:worker -- 5000            # batchSize=5000, default delay
 *   npm run collatz:worker -- 5000 500        # batchSize=5000, delay=500ms
 *   npm run collatz:worker -- 5000 0          # no delay between batches
 *
 * Environment variables (all optional — CLI args take precedence):
 *   COLLATZ_RESULT_BATCH_SIZE   Numbers per batch. Default: 5000.
 *                               Larger = fewer DB round-trips per number,
 *                               lower Disk IO overhead. Max crash-recovery
 *                               window = one batch worth of numbers.
 *   COLLATZ_LOG_INTERVAL_MS     Minimum wall-clock ms between activity log
 *                               writes. Default: 30000 (30 s). Set to 0 to
 *                               log every batch (not recommended in prod).
 *   COLLATZ_BATCH_DELAY_MS      Default inter-batch delay when not supplied
 *                               via CLI. Default: 0 (run as fast as safely
 *                               possible — state is still written every batch).
 */

import { loadEnvConfig } from "@next/env";

// Must run before any Supabase / store imports so env vars are present.
loadEnvConfig(process.cwd());

// ── Env-var config ────────────────────────────────────────────────────────────

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const ENV_BATCH_SIZE = envInt("COLLATZ_RESULT_BATCH_SIZE", 5_000);
const ENV_LOG_INTERVAL_MS = envInt("COLLATZ_LOG_INTERVAL_MS", 30_000);
const ENV_BATCH_DELAY_MS = envInt("COLLATZ_BATCH_DELAY_MS", 0);

// ── Interruptible sleep ───────────────────────────────────────────────────────

let wakeFromSleep: (() => void) | null = null;

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    wakeFromSleep = resolve;
    setTimeout(() => {
      wakeFromSleep = null;
      resolve();
    }, ms);
  });
}

// ── Shutdown flag ─────────────────────────────────────────────────────────────

let shouldStop = false;

function handleSignal(signal: string) {
  if (shouldStop) return;
  shouldStop = true;
  const wake = wakeFromSleep;
  wakeFromSleep = null;
  wake?.();
  process.stdout.write(
    `\n\n[Collatz Worker] ${signal} received — finishing current batch then stopping...\n`,
  );
}

process.on("SIGINT", () => handleSignal("SIGINT (Ctrl+C)"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

// ── Formatting helpers ────────────────────────────────────────────────────────

function pad(s: string, width: number): string {
  return s.padStart(width);
}

function fmtN(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function elapsed(startMs: number): string {
  const s = Math.floor((Date.now() - startMs) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports — env must be loaded first
  const { runAutonomousBatch } = await import("../lib/collatz/autonomous-runner");
  const { getEngineState } = await import("../lib/collatz/store");

  // ── Parse & validate CLI args ─────────────────────────────────────────────
  const args = process.argv.slice(2);

  // CLI arg overrides env var; env var overrides hard default
  const rawBatch = parseInt(args[0] ?? "", 10);
  const batchSize = Number.isFinite(rawBatch) && rawBatch > 0 ? rawBatch : ENV_BATCH_SIZE;

  const rawDelay = parseInt(args[1] ?? "", 10);
  const delayMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? rawDelay : ENV_BATCH_DELAY_MS;

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100_000) {
    console.error(
      "Error: batchSize must be an integer between 1 and 100,000.\n" +
        "Usage: npm run collatz:worker -- [batchSize] [delayMs]",
    );
    process.exit(1);
  }

  if (!Number.isInteger(delayMs) || delayMs < 0) {
    console.error(
      "Error: delayMs must be a non-negative integer.\n" +
        "Usage: npm run collatz:worker -- [batchSize] [delayMs]",
    );
    process.exit(1);
  }

  // ── Banner ────────────────────────────────────────────────────────────────
  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│       Collatz Continuous Worker           │");
  console.log("└──────────────────────────────────────────┘");
  console.log(`  Batch size    ${fmtN(batchSize)} numbers per batch`);
  console.log(`  Delay         ${fmtN(delayMs)}ms between batches`);
  console.log(`  Activity log  every ${fmtN(ENV_LOG_INTERVAL_MS)}ms (COLLATZ_LOG_INTERVAL_MS)`);
  console.log(`  State store   Supabase (id = "main")`);
  console.log(`  Stop          Ctrl+C\n`);
  console.log(
    `  ${"#".padStart(5)}  ${"start".padStart(12)} – ${"end".padEnd(12)}  ` +
      `${"count".padStart(6)}  ${"duration".padStart(10)}  ${"rate".padStart(10)}`,
  );
  console.log("  " + "─".repeat(70));

  // ── Worker loop ───────────────────────────────────────────────────────────
  let iteration = 0;
  let totalProcessed = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  const workerStart = Date.now();

  // Wall-clock throttle: activity logs are written at most once per interval.
  let lastActivityLogMs = 0;

  while (!shouldStop) {
    // Read latest engine state on every iteration (detects stop from admin)
    const state = await getEngineState();

    if (!state) {
      throw new Error(
        "Engine state not found in Supabase.\n" +
          "Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
          "are set in .env.local and the collatz_engine_state table exists.",
      );
    }

    // Respect engine status — if admin pauses or stops, the worker idles
    if (state.current_status !== "running") {
      process.stdout.write(
        `  [paused]   Engine status is "${state.current_status}" — ` +
          `waiting ${fmtN(delayMs > 0 ? delayMs : 2000)}ms...\r`,
      );
      await sleep(delayMs > 0 ? delayMs : 2000);
      continue;
    }

    // ── Activity log throttle ────────────────────────────────────────────────
    // Write batch_started/batch_completed at most once per ENV_LOG_INTERVAL_MS.
    // batch_failed is always written unconditionally (inside runAutonomousBatch).
    const nowMs = Date.now();
    const shouldLogActivity =
      ENV_LOG_INTERVAL_MS === 0 || nowMs - lastActivityLogMs >= ENV_LOG_INTERVAL_MS;
    if (shouldLogActivity) {
      lastActivityLogMs = nowMs;
    }

    // ── Execute batch ────────────────────────────────────────────────────────
    iteration++;

    try {
      const result = await runAutonomousBatch({ batchSize, shouldLogActivity });
      consecutiveErrors = 0;
      totalProcessed += result.numbersProcessed;

      const durationStr =
        result.durationMs > 0 ? fmtMs(result.durationMs).padStart(10) : "          ";
      const rateStr =
        result.numbersPerSecond > 0
          ? `${result.numbersPerSecond.toFixed(1)}/s`.padStart(10)
          : "          ";

      console.log(
        `  ${pad(String(iteration), 5)}  ` +
          `${pad(fmtN(result.batchStart), 12)} – ${pad(fmtN(result.batchEnd), 12)}  ` +
          `${pad(fmtN(result.numbersProcessed), 6)}  ` +
          `${durationStr}  ${rateStr}`,
      );
    } catch (err: unknown) {
      consecutiveErrors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `  [error]    Batch #${iteration} failed ` +
          `(${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}): ${message}`,
      );

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(
          `\n[Collatz Worker] ${MAX_CONSECUTIVE_ERRORS} consecutive failures — ` +
            `halting to prevent data corruption. Check Supabase logs.`,
        );
        process.exit(1);
      }
    }

    // Wait before next batch (wakes immediately on SIGINT)
    if (!shouldStop && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  // ── Shutdown summary ──────────────────────────────────────────────────────
  console.log("\n  " + "─".repeat(70));
  console.log(`\n[Collatz Worker] Stopped cleanly.`);
  console.log(`  Batches completed : ${fmtN(iteration)}`);
  console.log(`  Numbers processed : ${fmtN(totalProcessed)}`);
  console.log(`  Total runtime     : ${elapsed(workerStart)}`);
  console.log(`  Engine state      : preserved in Supabase (started_at unchanged)\n`);

  process.exit(0);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[Collatz Worker] Fatal error:", message);
  process.exit(1);
});
