-- =============================================================================
-- Phase 6 — Activity Logs & Throughput Tracking
-- =============================================================================
-- Run this in the Supabase SQL Editor before testing Phase 6 features.
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS guards).
-- This migration does NOT reset any existing data.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1.  New table: public.collatz_activity_logs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.collatz_activity_logs (
    id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type         text         NOT NULL,
    message            text         NOT NULL,
    batch_start        bigint,
    batch_end          bigint,
    numbers_processed  bigint,
    duration_ms        bigint,
    numbers_per_second numeric,
    metadata           jsonb        NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.collatz_activity_logs                 IS 'Operational event log for the Collatz computation engine (Phase 6).';
COMMENT ON COLUMN public.collatz_activity_logs.event_type      IS 'One of: engine_started, engine_stopped, batch_started, batch_completed, batch_failed, checkpoint, record_updated, worker_heartbeat';
COMMENT ON COLUMN public.collatz_activity_logs.numbers_per_second IS 'Computed as numbers_processed / (duration_ms / 1000.0)';


-- ---------------------------------------------------------------------------
-- 2.  Indexes on collatz_activity_logs
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
    ON public.collatz_activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type
    ON public.collatz_activity_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_batch_start
    ON public.collatz_activity_logs (batch_start);

CREATE INDEX IF NOT EXISTS idx_activity_logs_batch_end
    ON public.collatz_activity_logs (batch_end);


-- ---------------------------------------------------------------------------
-- 3.  Permissions — match the current development setup on other tables
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE ON public.collatz_activity_logs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.collatz_activity_logs TO authenticated;


-- ---------------------------------------------------------------------------
-- 4.  Disable RLS — matching the current development setup
-- ---------------------------------------------------------------------------

ALTER TABLE public.collatz_activity_logs DISABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 5.  Add throughput-tracking columns to public.collatz_engine_state
--     (idempotent — uses ADD COLUMN IF NOT EXISTS)
-- ---------------------------------------------------------------------------

ALTER TABLE public.collatz_engine_state
    ADD COLUMN IF NOT EXISTS last_batch_size       bigint      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_batch_duration_ms bigint     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS numbers_per_second     numeric     DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_run_at            timestamptz,
    ADD COLUMN IF NOT EXISTS worker_heartbeat_at    timestamptz,
    ADD COLUMN IF NOT EXISTS last_error             text;

COMMENT ON COLUMN public.collatz_engine_state.last_batch_size        IS 'Number of integers processed in the most recent batch.';
COMMENT ON COLUMN public.collatz_engine_state.last_batch_duration_ms IS 'Wall-clock milliseconds taken by the most recent batch.';
COMMENT ON COLUMN public.collatz_engine_state.numbers_per_second     IS 'Throughput of the most recent batch (numbers / second).';
COMMENT ON COLUMN public.collatz_engine_state.last_run_at            IS 'Timestamp when the most recent batch completed successfully.';
COMMENT ON COLUMN public.collatz_engine_state.worker_heartbeat_at    IS 'Timestamp of the last worker heartbeat (updated on every batch attempt).';
COMMENT ON COLUMN public.collatz_engine_state.last_error             IS 'Error message from the most recent failed batch, or NULL if healthy.';


-- =============================================================================
-- Done.  Verify with:
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'collatz_engine_state' ORDER BY ordinal_position;
--   SELECT COUNT(*) FROM public.collatz_activity_logs;
-- =============================================================================
