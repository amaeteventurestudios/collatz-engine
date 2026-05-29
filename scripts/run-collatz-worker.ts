/**
 * Collatz Continuous Worker
 *
 * Runs batches in a tight loop until the engine status is no longer "running"
 * or the process receives SIGINT / SIGTERM (Ctrl+C).
 *
 * Runtime config is read from collatz_engine_runtime_config at startup and
 * refreshed every 60 seconds. Env vars are fallbacks; recovery defaults are
 * used if neither source is available.
 *
 * Usage:
 *   npm run collatz:worker          # reads runtime config from Supabase
 *
 * Env var overrides (all optional — runtime config table takes precedence):
 *   COLLATZ_RESULT_BATCH_SIZE, COLLATZ_BATCH_DELAY_MS, COLLATZ_LOG_INTERVAL_MS
 */

import { loadEnvConfig } from "@next/env";

// Must run before any Supabase / store imports so env vars are present.
loadEnvConfig(process.cwd());

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
  const { getRuntimeConfig, invalidateRuntimeConfigCache } =
    await import("../lib/collatz/runtime-config");

  // ── Load runtime config (with fallback to recovery defaults) ──────────────
  let cfg = await getRuntimeConfig();
  let lastConfigRefreshMs = Date.now();
  const CONFIG_REFRESH_INTERVAL_MS = 60_000;

  // ── Banner ────────────────────────────────────────────────────────────────
  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│       Collatz Continuous Worker           │");
  console.log("└──────────────────────────────────────────┘");
  console.log(`  Mode          ${cfg.mode}`);
  console.log(`  Batch size    ${fmtN(cfg.batchSize)} numbers per batch`);
  console.log(`  Delay         ${fmtN(cfg.batchDelayMs)}ms between batches`);
  console.log(`  Storage mode  ${cfg.storageMode} (keep ${fmtN(cfg.keepRecentResults)} results)`);
  console.log(`  Activity log  every ${fmtN(cfg.logIntervalMs)}ms`);
  console.log(`  Config source Supabase collatz_engine_runtime_config (refreshed every 60s)`);
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

  // Sequential integrity guard: tracks the last successful batchEnd so the
  // next batch can be verified to start at exactly previousBatchEnd + 1.
  let previousBatchEnd: number | null = null;

  // Wall-clock throttle: activity logs written at most once per logIntervalMs.
  let lastActivityLogMs = 0;

  while (!shouldStop) {
    // ── Refresh runtime config every 60s ────────────────────────────────────
    const nowMs = Date.now();
    if (nowMs - lastConfigRefreshMs >= CONFIG_REFRESH_INTERVAL_MS) {
      invalidateRuntimeConfigCache();
      cfg = await getRuntimeConfig();
      lastConfigRefreshMs = nowMs;
    }

    // Read latest engine state on every iteration (detects pause/stop from admin)
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
          `waiting ${fmtN(cfg.batchDelayMs > 0 ? cfg.batchDelayMs : 5000)}ms...\r`,
      );
      await sleep(cfg.batchDelayMs > 0 ? cfg.batchDelayMs : 5000);
      continue;
    }

    // ── Activity log throttle ────────────────────────────────────────────────
    const shouldLogActivity =
      cfg.logIntervalMs === 0 || nowMs - lastActivityLogMs >= cfg.logIntervalMs;
    if (shouldLogActivity) {
      lastActivityLogMs = nowMs;
    }

    // ── Execute batch ────────────────────────────────────────────────────────
    iteration++;

    try {
      const result = await runAutonomousBatch({
        batchSize: cfg.batchSize,
        shouldLogActivity,
        storageMode: cfg.storageMode,
        keepRecentResults: cfg.keepRecentResults,
      });
      consecutiveErrors = 0;

      // ── Sequential integrity check ──────────────────────────────────────────
      // Enforce: every batch must start at exactly previousBatchEnd + 1.
      // A gap here means last_checked_number was advanced by something other
      // than this worker. Halt immediately to prevent silent data loss.
      if (previousBatchEnd !== null && result.batchStart !== previousBatchEnd + 1) {
        const gapSize = result.batchStart - (previousBatchEnd + 1);
        console.error(
          `\n[Collatz Worker] FATAL — sequential integrity violation detected!` +
            `\n  Expected batchStart : ${fmtN(previousBatchEnd + 1)}` +
            `\n  Actual   batchStart : ${fmtN(result.batchStart)}` +
            `\n  Gap (numbers skipped): ${fmtN(gapSize)}` +
            `\n  This means last_checked_number was advanced outside this worker.` +
            `\n  Halting to prevent further data loss. Check engine state in Supabase.\n`,
        );
        process.exit(2);
      }
      previousBatchEnd = result.batchEnd;

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
    const effectiveDelay = cfg.batchDelayMs;
    if (!shouldStop && effectiveDelay > 0) {
      await sleep(effectiveDelay);
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
