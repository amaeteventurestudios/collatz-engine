# Free-Tier Storage Mode — The Collatz Engine

## Overview

`collatz_results` is operated as a **rolling recent buffer** in `free-tier` storage mode, not as a permanent catalog of every checked number.

The engine's authoritative state is always `collatz_engine_state`, not `collatz_results`. The engine resumes from `collatz_engine_state.last_checked_number` on restart regardless of what rows exist in `collatz_results`.

---

## Why free-tier mode exists

Supabase free/nano plans have a 2 GB database limit. At ~64 bytes per row with millions of numbers checked, `collatz_results` grows without bound and will exhaust the limit. Free-tier mode addresses this by:

1. Keeping only the most recent `keep_recent_results` rows in `collatz_results`
2. Trimming `collatz_activity_logs` to `activity_log_retention_rows` rows
3. Never deleting `collatz_engine_state`

---

## How collatz_results works in free-tier mode

- After every batch, the worker calls `prune_results_to_limit(keep_recent_results)` via Supabase RPC
- This deletes rows with the lowest `n` values beyond the keep limit
- The most recent `n` values (highest numbers) are retained
- Default cap: 1,000 rows (recovery mode), up to 10,000 rows (normal mode)
- The public dashboard reads from `collatz_engine_state` for current status — it does not depend on collatz_results being complete

### What collatz_results is used for

| Use | Depends on completeness? |
|---|---|
| Live dashboard status (current n, total checked) | No — reads from collatz_engine_state |
| Records/trajectories panel (longest steps, highest peak) | No — reads from collatz_engine_state |
| Near-escapes endpoint | Partial — works with recent rows |
| Latest results endpoint | Yes — shows recent window only |
| Data export | Yes — exports the recent window only |

---

## Engine state is the authoritative resume source

`collatz_engine_state.last_checked_number` is what the engine uses to resume. When the worker starts, it reads `last_checked_number` and begins from `last_checked_number + 1`. This is unchanged by any cleanup.

**You cannot corrupt the engine's progress by truncating `collatz_results`.** The engine will continue from where it left off.

---

## Mode presets

| Mode | batch_size | batch_delay_ms | keep_recent_results | activity_log_retention |
|---|---|---|---|---|
| Recovery | 25 | 10,000 ms | 1,000 rows | 250 rows |
| Safe | 50 | 5,000 ms | 5,000 rows | 500 rows |
| Normal | 250 | 2,000 ms | 10,000 rows | 1,000 rows |

Switch modes via the Admin Control Center → Runtime Config section, or via `npm run collatz:cleanup` to manually trigger cleanup.

---

## Admin pause/resume behavior

- **Pause**: Sets `collatz_engine_state.current_status = 'paused'`. The worker checks this on every iteration and sleeps instead of processing.
- **Resume**: Sets `current_status = 'running'`. The worker picks up from `last_checked_number + 1` on its next iteration.
- **Stop Engine**: Planned for Phase 3. Currently requires manually stopping the worker process.

Pause is the safe emergency stop. The worker does not need to be killed.

---

## Cleanup behavior

The `cleanup_collatz_storage(keep_results, keep_logs)` Postgres function:
1. Counts rows before
2. Deletes `collatz_results` rows with `n <= cutoff_n` (keeps the highest-n rows)
3. Deletes `collatz_activity_logs` rows with `created_at <= cutoff_ts` (keeps the most recent rows)
4. **Never touches**: `collatz_engine_state`, `collatz_integrity_runs`, `collatz_range_summaries`, `collatz_record_events`, `collatz_archive_manifests`
5. Returns a JSON summary with before/after counts

The cleanup RPC requires `service_role`. It is called from:
- Admin panel → Run Cleanup button
- `npm run collatz:cleanup`

---

## Emergency process

If the database is near the 2 GB limit:

1. **Pause the engine** via the admin panel
2. Run `npm run collatz:cleanup` locally, or use the admin panel Run Cleanup button
3. If still over limit, run `docs/operations/emergency-supabase-cleanup.sql` in the Supabase SQL Editor
4. Consider switching to Recovery mode via the admin panel
5. Resume the engine when storage is safe

Storage thresholds: Safe < 1.2 GB · Watch 1.2–1.5 GB · Warning 1.5–1.8 GB · Critical 1.8–1.9 GB · Pause Required > 1.9 GB

---

## Runtime config table

`collatz_engine_runtime_config` (single row, id = 'main') controls the live worker behavior. The worker reads it at startup and refreshes every 60 seconds without restarting.

To apply: use the admin panel mode preset buttons, or edit the row directly in Supabase. Changes take effect within 60 seconds.

Env vars (`COLLATZ_RESULT_BATCH_SIZE`, etc.) are fallbacks used only when the table row is unavailable.
