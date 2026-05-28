-- =============================================================================
-- Emergency Supabase Cleanup — The Collatz Engine
-- =============================================================================
-- Run these queries in the Supabase SQL Editor (NOT via the admin panel).
-- Use only when storage is critical and the normal cleanup RPC is unavailable.
--
-- WARNING: NEVER truncate collatz_engine_state.
-- WARNING: NEVER truncate collatz_integrity_runs.
-- WARNING: These operations are irreversible. The engine will resume from its
--          last saved state in collatz_engine_state — no numbers are re-done.
-- =============================================================================


-- ── Step 1: Check current table sizes ────────────────────────────────────────

SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_total_relation_size(relid) AS total_bytes,
  n_live_tup AS estimated_rows
FROM pg_catalog.pg_statio_user_tables
LEFT JOIN pg_stat_user_tables USING (relid)
ORDER BY pg_total_relation_size(relid) DESC;


-- ── Step 2: Confirm engine state is present BEFORE touching anything ──────────

SELECT id, current_status, last_checked_number, total_numbers_checked, updated_at
FROM public.collatz_engine_state;

-- If this returns 0 rows, DO NOT proceed. Contact support.


-- ── Step 3 (recommended): Use the safe cleanup RPC ───────────────────────────
-- Keeps the 1000 most recent collatz_results and 250 most recent activity logs.

SELECT public.cleanup_collatz_storage(1000, 250);


-- ── Step 4 (emergency only): Truncate ordinary result rows ────────────────────
-- Safe because the engine resumes from collatz_engine_state.last_checked_number.
-- The dashboard still works — it reads from collatz_engine_state directly.
-- This clears ALL ordinary result rows. The engine will re-populate on next run.
-- DO NOT run this if you need the current collatz_results for export.

-- TRUNCATE TABLE public.collatz_results;


-- ── Step 5 (optional): Truncate activity logs ─────────────────────────────────
-- Activity logs are operational event history, not catalog data.
-- Safe to clear completely if storage is critical.

-- TRUNCATE TABLE public.collatz_activity_logs;


-- ── Step 6: Verify engine state survived ──────────────────────────────────────

SELECT id, current_status, last_checked_number, total_numbers_checked
FROM public.collatz_engine_state;

-- Should show your existing engine state unchanged.


-- ── Step 7: Check sizes after cleanup ────────────────────────────────────────

SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;


-- =============================================================================
-- NEVER RUN:
--   DROP TABLE collatz_engine_state;
--   TRUNCATE collatz_engine_state;
--   DELETE FROM collatz_engine_state;
-- The engine state is the authoritative resume point. Losing it means losing
-- track of how far the engine has computed.
-- =============================================================================
