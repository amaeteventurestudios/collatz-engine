# Operational Watchdog

The watchdog evaluates live engine state on every metrics poll and returns a single top-level health status plus five individual signals. It is a **pure computation module** — it reads data only, never writes.

## Overall Status

| Status   | Meaning                                                        |
|----------|----------------------------------------------------------------|
| safe     | All signals are safe or unknown. No action required.           |
| warning  | At least one signal is in warning. Monitor the situation.      |
| critical | At least one signal is critical. Immediate action required.    |
| unknown  | No data available to assess health.                            |

Overall is the worst status across all five signals.

---

## Signals

### 1. Worker Lock

Evaluates whether the distributed worker lock is healthy.

| Condition                                       | Status   |
|-------------------------------------------------|----------|
| Lock table not found                            | unknown  |
| No lock record, engine not running              | unknown  |
| No lock record, engine running                  | critical |
| Active lock, fresh heartbeat, not near expiry   | safe     |
| Active lock, heartbeat >60s old or <10s to expire | warning |
| Active lock, already expired                    | critical |
| Last lock expired, engine not running           | warning  |
| Last lock expired, engine running               | critical |
| Lock force-released                             | warning  |
| Lock released cleanly                           | safe     |

TTL is 30 s; heartbeat fires every 10 s. A healthy worker renews the lock well before expiry.

---

### 2. Worker Progress

Evaluates whether the engine is making progress based on heartbeat age.

| Condition                        | Status   |
|----------------------------------|----------|
| Engine state unavailable         | unknown  |
| Engine paused                    | safe     |
| No heartbeat recorded            | unknown  |
| Heartbeat age < 180 s            | safe     |
| Heartbeat age 180–599 s          | warning  |
| Heartbeat age ≥ 600 s (10 min)   | critical |

---

### 3. Sequence Pointer

Evaluates whether `currentNumber` is advancing sequentially from `lastProcessed`.

| Condition                              | Status   |
|----------------------------------------|----------|
| Either value is null                   | unknown  |
| currentNumber = lastProcessed + 1      | safe     |
| currentNumber ≠ lastProcessed + 1      | critical |

A gap indicates the engine may have skipped numbers, leaving unverified coverage.

---

### 4. Storage

Maps the storage monitor status to a watchdog status.

| Storage status | Watchdog status |
|----------------|-----------------|
| safe           | safe            |
| watch          | safe            |
| warning        | warning         |
| critical       | critical        |
| pause          | critical        |

Thresholds: safe <1.2 GB · watch 1.2–1.5 GB · warning 1.5–1.8 GB · critical 1.8–1.9 GB · pause >1.9 GB.

---

### 5. Runtime Config

Evaluates whether the runtime config table is present.

| Condition                      | Status  |
|--------------------------------|---------|
| Config table exists in DB      | safe    |
| Config table not found         | warning |

A missing config table means the engine uses environment variable defaults and live mode switching is unavailable.

---

## Operational Procedures

### Warning state
- Check the specific signal(s) in warning.
- For **lock warning**: verify the worker is running and its log is healthy. If the worker is stopped, the lock will expire on its own.
- For **progress warning**: check the worker log. The worker may be processing a slow number or is delayed by database latency.
- For **storage warning**: run the cleanup action from the admin dashboard Archive/Retention section.
- For **config warning**: run `supabase/phase-2a-storage-guardrails.sql` in the Supabase SQL Editor.

### Critical state
- For **lock critical**: confirm whether the worker is actually running. If it crashed, restart it. If it is running normally, investigate why the heartbeat is not updating.
- For **progress critical**: the worker is likely stopped. Check process status and restart if appropriate.
- For **pointer critical**: investigate the engine state table directly. Check for gaps in `collatz_results` around `lastProcessed`.
- For **storage critical**: run cleanup immediately or pause the engine to prevent data loss.

### Unknown state
- Indicates missing infrastructure (lock table, config table) or a database connectivity issue.
- Run the relevant migrations and verify Supabase connectivity.

---

## Implementation

- **Module**: `lib/admin/watchdog.ts` — pure function, no DB calls
- **Evaluated**: on every `/api/admin/metrics` poll (every 5 s in the admin UI)
- **Displayed**: "Operations Health" section at the top of the live metrics panel
