/**
 * Collatz Worker Lock Verifier
 *
 * Proves that the database-backed worker lock correctly prevents two workers
 * from processing batches simultaneously.
 *
 * Uses lock_name='__verify__' — never touches the production 'primary' lock.
 * All test locks are cleaned up in a try/finally block.
 *
 * Usage:
 *   npm run collatz:verify-worker-lock
 *
 * Exit codes:
 *   0  all checks passed
 *   1  one or more checks failed
 */

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TEST_LOCK = "__verify__";
const WORKER_A = "verify-worker-a-000-aaaa";
const WORKER_B = "verify-worker-b-000-bbbb";

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

async function main() {
  const {
    acquireWorkerLock,
    heartbeatWorkerLock,
    releaseWorkerLock,
    getActiveLock,
  } = await import("../lib/collatz/worker-lock");

  console.log("\n┌──────────────────────────────────────────┐");
  console.log("│   Collatz Worker Lock Verifier            │");
  console.log("└──────────────────────────────────────────┘");
  console.log(`  Lock name used for tests: '${TEST_LOCK}'\n`);

  // ── Pre-flight: clean up any leftover test locks from previous runs ───────
  await releaseWorkerLock({ workerInstanceId: WORKER_A, lockName: TEST_LOCK });
  await releaseWorkerLock({ workerInstanceId: WORKER_B, lockName: TEST_LOCK });

  try {
    // ── Test 1: Acquire lock when none exists ────────────────────────────────
    console.log("  Test 1: Acquire lock when none exists");
    {
      const result = await acquireWorkerLock({
        workerInstanceId: WORKER_A,
        hostname: "verify-host",
        pid: 1,
        ttlSeconds: 30,
        lockName: TEST_LOCK,
      });

      if (result.success && result.lock?.worker_instance_id === WORKER_A) {
        ok("Worker A acquired lock successfully");
      } else {
        fail("Worker A should have acquired lock", result.reason ?? result.error);
      }
    }

    // ── Test 2: Same worker can heartbeat ────────────────────────────────────
    console.log("\n  Test 2: Same worker can heartbeat");
    {
      const result = await heartbeatWorkerLock({
        workerInstanceId: WORKER_A,
        ttlSeconds: 30,
        lockName: TEST_LOCK,
      });

      if (result.success && result.expiresAt) {
        ok("Worker A heartbeated successfully");
      } else {
        fail("Heartbeat should succeed for lock owner", result.reason ?? result.error);
      }
    }

    // ── Test 3: Second worker cannot acquire while first is active ────────────
    console.log("\n  Test 3: Second worker cannot acquire while first is active");
    {
      const result = await acquireWorkerLock({
        workerInstanceId: WORKER_B,
        hostname: "verify-host-2",
        pid: 2,
        ttlSeconds: 30,
        lockName: TEST_LOCK,
      });

      if (!result.success && result.reason === "active_lock_exists") {
        ok("Worker B correctly refused — lock held by Worker A");
        if (result.currentOwner?.worker_instance_id === WORKER_A) {
          ok("Current owner info returned correctly");
        } else {
          fail("Current owner should be Worker A", JSON.stringify(result.currentOwner));
        }
      } else {
        fail("Worker B should have been refused", `success=${result.success}, reason=${result.reason}`);
      }
    }

    // ── Test 4: Non-owner cannot heartbeat ────────────────────────────────────
    console.log("\n  Test 4: Non-owner heartbeat fails");
    {
      const result = await heartbeatWorkerLock({
        workerInstanceId: WORKER_B,
        ttlSeconds: 30,
        lockName: TEST_LOCK,
      });

      if (!result.success && result.reason === "lock_not_owned_or_expired") {
        ok("Worker B heartbeat correctly refused");
      } else {
        fail("Heartbeat by non-owner should fail", result.reason ?? result.error);
      }
    }

    // ── Test 5: Lock owner can verify active lock ─────────────────────────────
    console.log("\n  Test 5: getActiveLock returns Worker A's lock");
    {
      const lock = await getActiveLock(TEST_LOCK);
      if (lock && lock.worker_instance_id === WORKER_A && lock.status === "active") {
        ok("getActiveLock returns correct active lock");
      } else {
        fail("getActiveLock should return Worker A's lock", JSON.stringify(lock));
      }
    }

    // ── Test 6: First worker releases the lock ────────────────────────────────
    console.log("\n  Test 6: First worker releases the lock");
    {
      const result = await releaseWorkerLock({
        workerInstanceId: WORKER_A,
        lockName: TEST_LOCK,
      });

      if (result.success) {
        ok("Worker A released lock successfully");
      } else {
        fail("Release should succeed for lock owner", result.reason ?? result.error);
      }
    }

    // ── Test 7: No active lock after release ──────────────────────────────────
    console.log("\n  Test 7: No active lock after release");
    {
      const lock = await getActiveLock(TEST_LOCK);
      if (!lock) {
        ok("getActiveLock returns null after release");
      } else {
        fail("No active lock expected after release", JSON.stringify(lock));
      }
    }

    // ── Test 8: Second worker can acquire after release ───────────────────────
    console.log("\n  Test 8: Second worker can acquire after release");
    {
      const result = await acquireWorkerLock({
        workerInstanceId: WORKER_B,
        hostname: "verify-host-2",
        pid: 2,
        ttlSeconds: 5,
        lockName: TEST_LOCK,
      });

      if (result.success && result.lock?.worker_instance_id === WORKER_B) {
        ok("Worker B acquired lock after Worker A released it");
      } else {
        fail("Worker B should acquire after release", result.reason ?? result.error);
      }
    }

    // ── Test 9: Expired lock does not block new worker ────────────────────────
    // Worker B holds a 5s lock — wait 6s for it to expire, then Worker A acquires
    console.log("\n  Test 9: Expired lock does not block new worker (waiting 6s for TTL...)");
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    {
      const result = await acquireWorkerLock({
        workerInstanceId: WORKER_A,
        hostname: "verify-host",
        pid: 1,
        ttlSeconds: 30,
        lockName: TEST_LOCK,
      });

      if (result.success && result.lock?.worker_instance_id === WORKER_A) {
        ok("Worker A acquired lock after Worker B's lock expired");
      } else {
        fail("Worker A should acquire after TTL expiry", result.reason ?? result.error);
      }
    }

    // ── Test 10: Release for cleanup ──────────────────────────────────────────
    console.log("\n  Test 10: Cleanup — release Worker A's lock");
    {
      const result = await releaseWorkerLock({
        workerInstanceId: WORKER_A,
        lockName: TEST_LOCK,
      });
      if (result.success) {
        ok("Cleanup release succeeded");
      } else {
        fail("Cleanup release failed", result.reason ?? result.error);
      }
    }

  } finally {
    // ── Final cleanup — ensure no test locks remain active ────────────────────
    await releaseWorkerLock({ workerInstanceId: WORKER_A, lockName: TEST_LOCK });
    await releaseWorkerLock({ workerInstanceId: WORKER_B, lockName: TEST_LOCK });
  }

  // ── Report production lock state ──────────────────────────────────────────
  console.log("\n  ─────────────────────────────────────────");
  console.log("  Production lock state ('primary'):");
  {
    const { getActiveLock: getActive } = await import("../lib/collatz/worker-lock");
    const lock = await getActive("primary");
    if (!lock) {
      console.log("  No active production lock — safe to start a worker when ready.");
    } else {
      console.log(`  ACTIVE lock held by: ${lock.worker_instance_id}`);
      console.log(`  Hostname : ${lock.hostname ?? "—"}  PID: ${lock.pid ?? "—"}`);
      console.log(`  Acquired : ${lock.acquired_at}`);
      console.log(`  Expires  : ${lock.expires_at}`);
      console.log(`  WARNING  : Do not start another worker until this lock expires or is released.`);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n  ─────────────────────────────────────────");
  console.log(`  Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.error(`[verify-worker-lock] FAIL — ${failed} check(s) did not pass.\n`);
    process.exit(1);
  } else {
    console.log(`[verify-worker-lock] PASS — all ${passed} checks passed.\n`);
    process.exit(0);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n[verify-worker-lock] Fatal error:", message);
  process.exit(1);
});
