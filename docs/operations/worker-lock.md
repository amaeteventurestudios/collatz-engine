# Collatz Worker Lock — Operations Guide

## Why the lock exists

On 2026-05-28, a sequential integrity violation occurred because two workers processed the same batch ranges simultaneously: a local iMac worker (batch size 50) and a hidden Hetzner systemd service (`collatz-worker.service`, batch size 100/1000) both started at batch_start 7,646,802. This caused overlapping writes and a gap in the sequential number catalog.

The worker lock ensures **only one Collatz worker may process batches at any time**, regardless of which machine it runs on.

---

## How it works

The lock lives in the `collatz_worker_lock` table in Supabase. Key properties:

- **One active lock per lock_name**: a PostgreSQL partial unique index on `status = 'active'` enforces this at the database level, preventing races even if two workers check simultaneously.
- **Atomic acquisition**: the `acquire_collatz_worker_lock` RPC is `SECURITY DEFINER` and handles the check-then-insert atomically, avoiding client-side TOCTOU races.
- **TTL-based auto-expiry**: if a worker crashes without releasing, the lock expires automatically after 30 seconds. No manual intervention is needed — the next worker can acquire normally.
- **Heartbeat**: the running worker sends a heartbeat every 10 seconds, extending the TTL by 30 seconds. If the worker dies, the TTL counts down from the last successful heartbeat.
- **Clean release**: on `SIGINT`, `SIGTERM`, or normal completion, the worker calls `release_collatz_worker_lock` and the status is set to `released`.

---

## Lock parameters

| Parameter | Value |
|---|---|
| Lock TTL | 30 seconds |
| Heartbeat interval | 10 seconds |
| Heartbeats per TTL | 3 (safe margin) |
| Max heartbeat failures before halt | 3 |

---

## Worker instance ID format

Each worker process generates a unique instance ID on startup:

```
<hostname>-<pid>-<unix_timestamp_ms>-<4_hex_chars>
```

Example: `macbook-pro-12345-1748428800000-a3f7`

This ID is stored in the lock row and displayed in the admin dashboard. It allows you to identify exactly which machine and process holds the lock.

---

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Clean shutdown |
| 1 | Fatal error (consecutive batch failures, uncaught exception) |
| 2 | Sequential integrity violation (gap detected between batches) |
| 3 | Lock already held by another worker — refused to start |
| 4 | Heartbeat failed — lock may be lost, stopped for safety |

---

## Admin dashboard

The Worker Lock panel is visible at `/admin` under "Worker Lock". It shows:

- Lock status (Active / Released / Expired / None)
- Instance ID, hostname, PID
- Acquired at, last heartbeat, expires at
- Seconds until expiry (red if < 10s)
- Warning if the engine is paused but a worker holds the lock
- Warning if the last lock expired without a clean release

### Force releasing a lock

Use **Force Release Lock** in the admin dashboard only when:
1. The worker is **confirmed stopped** (process is dead, Hetzner service is disabled).
2. The lock is still showing as active (worker crashed without releasing).

Force-releasing an active worker's lock while it is still running will cause the worker to detect the loss (via pre-batch ownership check) and stop immediately (exit code 4). This is safe — it will not corrupt data, but it will stop the worker mid-run.

After force release, you can start a new worker normally.

---

## How stale lock expiry works

If a worker process dies without calling `release_collatz_worker_lock`:

1. The lock's `expires_at` passes without a heartbeat extending it.
2. On the next `acquire_collatz_worker_lock` call, the acquire RPC checks `expires_at > now()`. If false, it marks the old lock `status = 'expired'` and inserts a new active lock.
3. The new worker proceeds normally.

No cron job or background cleanup is needed. Expiry is handled lazily on the next acquisition attempt.

---

## Hetzner service

The Hetzner `collatz-worker.service` has been **stopped and disabled** as of the 2026-05-28 incident. It must remain disabled until:

1. This Phase 2B commit (`Add database-backed Collatz worker lock`) is deployed to the production path (`/opt/collatz`).
2. The SQL migration (`supabase/phase-2b-worker-lock.sql`) has been applied in the Supabase SQL Editor.
3. The Hetzner service unit file is updated to use `npm run collatz:worker` (no extra arguments).
4. The engine is verified as paused and no active lock exists.
5. An operator manually starts the worker on the intended machine.

**Only one worker should ever run at a time.**

---

## Verification

```bash
# Run the live lock verification suite (uses __verify__ lock, not production)
npm run collatz:verify-worker-lock

# Check sequential integrity of recent batch logs
npm run collatz:verify-sequential
```

The verification script tests 10 scenarios including concurrent acquisition, heartbeat, expiry, and cleanup — all using a dedicated `__verify__` lock name that does not affect the production `primary` lock.

---

## Manual lock inspection (Supabase SQL Editor)

```sql
-- Current active lock
SELECT * FROM collatz_worker_lock WHERE lock_name = 'primary' AND status = 'active';

-- Recent lock history
SELECT id, worker_instance_id, hostname, pid, acquired_at, expires_at, released_at, status
FROM collatz_worker_lock
WHERE lock_name = 'primary'
ORDER BY created_at DESC
LIMIT 10;

-- Force release (emergency only — prefer the admin dashboard)
SELECT force_release_collatz_worker_lock('primary');
```
