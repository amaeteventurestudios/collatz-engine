# Historical Records Backfill

The historical records backfill reconstructs true all-time Collatz leaderboards from `n = 1` through a frozen checkpoint. It is separate from the live worker and does not reset, pause, or modify the live engine.

## Purpose

`collatz_all_time_records` preserves top all-time candidates outside the retained `collatz_results` buffer. The retained-buffer seed is useful for continuity, but it is not a historical reconstruction. The backfill recalculates every starting number from `1` to a frozen `target_number` and writes only the top records to permanent storage.

## Safety Rules

The backfill script writes only:

- `collatz_all_time_records`
- `collatz_record_backfill_state`

It does not write:

- `collatz_engine_state`
- `collatz_results`
- `collatz_worker_lock`
- runtime config
- cleanup tables or storage

Do not run cleanup as part of a backfill. Do not restart or pause the live worker for a backfill.

## Frozen Checkpoint

When a real backfill starts, the script reads `collatz_engine_state.last_checked_number` once and stores it as `collatz_record_backfill_state.target_number`. The backfill stops at that frozen number even if the live engine continues advancing.

Example:

```text
last_checked_number = 7,868,626
target_number = 7,868,626
backfill range = 1 -> 7,868,626
```

Future live preservation handles records after the frozen checkpoint.

## Setup

Run the migration before the first real backfill:

```sql
-- Supabase SQL Editor
-- paste and run:
supabase/phase-3h-record-backfill-state.sql
```

## Commands

Dry-run without database writes:

```bash
npm run records:backfill:dry-run
```

Dry-run a custom range:

```bash
npm run records:backfill -- --dry-run --start 1 --end 10000
```

Start or resume the real backfill:

```bash
npm run records:backfill
```

Check status:

```bash
npm run records:backfill:status
```

Request pause:

```bash
npm run records:backfill -- --pause
```

Resume after pause:

```bash
npm run records:backfill -- --resume
npm run records:backfill
```

Use a different batch size or retained top count:

```bash
npm run records:backfill -- --batch-size 20000 --top 1000
```

## Verification

Run:

```bash
npm run records:verify-backfill
npm run records:verify-permanent
npm run collatz:verify-sequential
npm run collatz:verify-worker-lock
```

The dry-run range `1 -> 1000` should report:

- Longest: `n = 871`, `178` steps
- Highest peak: `n = 703`, peak `250504`

## Homepage Behavior

The homepage All-Time Engine Records section always shows the authoritative headline values from `collatz_engine_state` at rank #1 until reconstructed details are available. Missing details are shown as `not retained`; they are not inferred.

When historical backfill records are present, the permanent rows are used for the remaining table rankings. Once the backfill reaches the historical 664-step trajectory and highest peak record, their actual starting numbers can appear without fake data.

The homepage also reads `collatz_record_backfill_state` when available:

- `running`: shows reconstruction progress through the frozen checkpoint
- `paused`: shows paused progress
- `completed`: shows the reconstructed checkpoint
- missing table or `idle`: shows that reconstruction has not started

## Layout Stability

The live dashboard updates by client polling. To avoid scroll jumps while users read the page:

- loading badges reserve space instead of appearing/disappearing
- all-time and retained leaderboards reserve ten table rows
- changing numeric fields use tabular number styling
- polling updates content in place and does not refresh the full page

This keeps desktop and mobile scroll positions stable while live data continues updating.
