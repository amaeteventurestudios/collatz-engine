# Disk IO Hardening

## Why this was added

Supabase flagged high Disk IO consumption. The root cause was the engine
worker using a tiny default batch size (100 numbers), which caused a
write amplification cascade:

- 1 `upsert` of 100 rows to `collatz_results` per batch
- 1 `update` of `collatz_engine_state` per batch
- 2 `insert` to `collatz_activity_logs` per batch (started + completed)
- 1 `select` to verify commit per batch

At even modest throughput (5 000 numbers/sec) that meant **50 state
updates/sec** and **100 activity log inserts/sec**. Supabase's WAL writes
scale with operation count, not just row count, so many small transactions
cost far more than a few large ones.

## What changed

| Area | Before | After |
|---|---|---|
| Default batch size | 100 | **5 000** (env-configurable) |
| Activity logs in worker | Every batch (up to 100/min) | **Once per 30 s** (env-configurable) |
| `batch_failed` log | Every failure | Still every failure (unchanged) |
| Frontend polling | Unchanged — already well-throttled | Unchanged |
| Realtime subscriptions | None (already correct) | None |

The result is roughly **50× fewer DB operations** per number processed
while persisting the same data and preserving resume behavior.

## Environment variables

Set these in `.env.local` (worker environment only — never commit the file).

| Variable | Default | Description |
|---|---|---|
| `COLLATZ_RESULT_BATCH_SIZE` | `5000` | Numbers computed per DB write cycle. Larger = lower IO overhead; maximum unrecovered progress on crash = 1 batch. |
| `COLLATZ_LOG_INTERVAL_MS` | `30000` | Minimum ms between `batch_started`/`batch_completed` activity log entries in the continuous worker. `0` = log every batch. |
| `COLLATZ_BATCH_DELAY_MS` | `0` | Inter-batch sleep in the worker when not passed as a CLI arg. |

## How controlled realtime works

The frontend does **not** subscribe to any Supabase realtime channel.
All frontend updates use polling:

| Component | Interval | Table / endpoint |
|---|---|---|
| Engine status (live state hook) | 2 s | `collatz_engine_state` (1 row) |
| Records preview | 5 s | `collatz_results` ORDER BY steps/peak |
| Analytics charts | 5 s | `collatz_results` windowed |
| Pattern views | 10 s | `collatz_results` |
| Visual Studio | 8 s | `collatz_results` + `collatz_engine_state` |
| Discovery feed | 30 s | `collatz_activity_logs` |
| Verification panel | 30 s | `collatz_integrity_runs` |
| Health card | 30 s | `collatz_engine_state` |

The 2-second engine-state poll is intentionally tight so the live counter
stays responsive. It reads exactly 1 row and is the cheapest possible query.

## Trajectory storage policy

Full trajectory sequences are **never** stored in `collatz_results`.
That table stores summary scalars only: `n`, `steps`, `peak`, `reached_one`.

Full trajectory/detail is computed on-demand and stored in:

- `trajectory_samples` field of batch summaries (records + near-escape only)
- Observatory display, driven by client-side `computeCollatz` or DB record fetch

## What not to change without checking Supabase IO

1. **Do not reduce `COLLATZ_RESULT_BATCH_SIZE` below 1 000** without
   understanding the write amplification cost.
2. **Do not add a realtime subscription** to `collatz_results` — it is a
   high-volume insert table and subscriptions create WAL read pressure.
3. **Do not poll engine_state faster than 1 s** — the engine writes it at
   most once per batch, and faster polling just creates read load.
4. **Do not add per-number DB writes** inside any engine loop.
