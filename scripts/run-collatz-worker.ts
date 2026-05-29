/**
 * Collatz Continuous Worker
 *
 * Runs batches in a tight loop until the engine status is no longer "running"
 * or the process receives SIGINT / SIGTERM (Ctrl+C).
 *
 * Worker Lock: a database-backed distributed mutex prevents two workers from
 * running simultaneously across all machines (iMac, laptop, Hetzner). The
 * lock is acquired before the first batch, heartbeated every 10 seconds, and
 * released on clean shutdown. If the process dies the lock expires in 30s.
 *
 * Runtime config is read from collatz_engine_runtime_config at startup and
 * refreshed every 60 seconds. Env vars are fallbacks; recovery defaults are
 * used if neither source is available.
 *
 * Usage:
 *   npm run collatz:worker          # reads runtime config from Supabase
 *
 * Exit codes:
 *   0  clean shutdown (SIGINT / SIGTERM / engine stopped)
 *   1  fatal error (consecutive batch failures, uncaught exception)
 *   2  sequential integrity violation (gap detected between batches)
 *   3  lock already held by another worker (refused to start)
 *   4  heartbeat failed — lock may be lost, stopped for safety
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
  const {
    generateWorkerInstanceId,
    acquireWorkerLock,
    heartbeatWorkerLock,
    releaseWorkerLock,
    getActiveLock,
    HEARTBEAT_INTERVAL_MS,
    LOCK_TTL_SECONDS,
    isLockExpired,
    isOwnedByWorker,
  } = await import("../lib/collatz/worker-lock");

  // ── Generate unique worker identity for this process ─────────────────────
  const workerInstanceId = generateWorkerInstanceId();

  // ── Acquire distributed lock before doing any work ───────────────────────
  console.log(`\n[Collatz Worker] Acquiring worker lock (TTL ${LOCK_TTL_SECONDS}s)...`);
  const acquireResult = await acquireWorkerLock({ workerInstanceId });

  if (!acquireResult.success) {
    if (acquireResult.reason === "active_lock_exists" && acquireResult.currentOwner) {
      const o = acquireResult.currentOwner;
      console.error(`\n[Collatz Worker] REFUSED — another worker already holds the lock.`);
      console.error(`  Instance ID : ${o.worker_instance_id}`);
      console.error(`  Hostname    : ${o.hostname ?? "—"}`);
      console.error(`  PID         : ${o.pid ?? "—"}`);
      console.error(`  Acquired at : ${o.acquired_at}`);
      console.error(`  Expires at  : ${o.expires_at}`);
      console.error(`\n  Stop the running worker or use the admin dashboard to force-release.\n`);
    } else {
      console.error(
        `\n[Collatz Worker] Failed to acquire lock: ${acquireResult.reason ?? "unknown"}` +
          (acquireResult.error ? ` — ${acquireResult.error}` : "") + "\n",
      );
    }
    process.exit(3);
  }

  console.log(`  Lock acquired. Instance ID: ${workerInstanceId}\n`);

  // ── Heartbeat tracking ────────────────────────────────────────────────────
  let heartbeatFailCount = 0;
  let heartbeatFailed = false;
  const MAX_HEARTBEAT_FAILURES = 3;

  const heartbeatInterval = setInterval(async () => {
    const hb = await heartbeatWorkerLock({ workerInstanceId });
    if (!hb.success) {
      heartbeatFailCount++;
      console.error(
        `\n[Collatz Worker] Heartbeat failed (${heartbeatFailCount}/${MAX_HEARTBEAT_FAILURES}):` +
          ` ${hb.reason ?? hb.error ?? "unknown"}`,
      );
      if (heartbeatFailCount >= MAX_HEARTBEAT_FAILURES) {
        heartbeatFailed = true;
      }
    } else {
      heartbeatFailCount = 0;
    }
  }, HEARTBEAT_INTERVAL_MS);

  // ── Load runtime config (with fallback to recovery defaults) ──────────────
  let cfg = await getRuntimeConfig();
  let lastConfigRefreshMs = Date.now();
  const CONFIG_REFRESH_INTERVAL_MS = 60_000;

  // ── Banner ────────────────────────────────────────────────────────────────
  console.log("┌──────────────────────────────────────────┐");
  console.log("│       Collatz Continuous Worker           │");
  console.log("└──────────────────────────────────────────┘");
  console.log(`  Mode          ${cfg.mode}`);
  console.log(`  Batch size    ${fmtN(cfg.batchSize)} numbers per batch`);
  console.log(`  Delay         ${fmtN(cfg.batchDelayMs)}ms between batches`);
  console.log(`  Storage mode  ${cfg.storageMode} (keep ${fmtN(cfg.keepRecentResults)} results)`);
  console.log(`  Activity log  every ${fmtN(cfg.logIntervalMs)}ms`);
  console.log(`  Worker lock   held (heartbeat every ${HEARTBEAT_INTERVAL_MS / 1000}s, TTL ${LOCK_TTL_SECONDS}s)`);
  console.log(`  Instance ID   ${workerInstanceId}`);
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

  try {
    while (!shouldStop) {
      // ── Heartbeat health check ─────────────────────────────────────────────
      if (heartbeatFailed) {
        console.error(
          `\n[Collatz Worker] FATAL — heartbeat failed ${MAX_HEARTBEAT_FAILURES} times.` +
            ` The lock may have been lost. Stopping to prevent concurrent processing.\n`,
        );
        process.exit(4);
      }

      // ── Verify lock ownership before every batch ───────────────────────────
      // Guards against: force-release by admin, clock drift causing expiry,
      // or any other case where this worker no longer holds the lock.
      const currentLock = await getActiveLock();
      if (!currentLock || isLockExpired(currentLock) || !isOwnedByWorker(currentLock, workerInstanceId)) {
        const lockInfo = currentLock
          ? `lock now owned by ${currentLock.worker_instance_id}`
          : "no active lock found";
        console.error(
          `\n[Collatz Worker] FATAL — worker lock is no longer held by this process (${lockInfo}).` +
            ` Stopping immediately to prevent concurrent processing.\n`,
        );
        process.exit(4);
      }

      // ── Refresh runtime config every 60s ──────────────────────────────────
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

      // ── Activity log throttle ──────────────────────────────────────────────
      const shouldLogActivity =
        cfg.logIntervalMs === 0 || nowMs - lastActivityLogMs >= cfg.logIntervalMs;
      if (shouldLogActivity) {
        lastActivityLogMs = nowMs;
      }

      // ── Execute batch ──────────────────────────────────────────────────────
      iteration++;

      try {
        const result = await runAutonomousBatch({
          batchSize: cfg.batchSize,
          shouldLogActivity,
          storageMode: cfg.storageMode,
          keepRecentResults: cfg.keepRecentResults,
        });
        consecutiveErrors = 0;

        // ── Sequential integrity check ────────────────────────────────────────
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
  } finally {
    // ── Cleanup: stop heartbeat and release lock ──────────────────────────────
    clearInterval(heartbeatInterval);
    const releaseResult = await releaseWorkerLock({ workerInstanceId });
    if (releaseResult.success) {
      console.log(`\n[Collatz Worker] Worker lock released.`);
    } else {
      console.warn(
        `\n[Collatz Worker] Lock release: ${releaseResult.reason ?? releaseResult.error ?? "no active lock to release"} (may have already expired or been force-released).`,
      );
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
