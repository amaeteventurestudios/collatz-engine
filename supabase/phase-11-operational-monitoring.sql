-- =============================================================================
-- Phase 11 - Operational Monitoring + Automated Integrity Runs
-- =============================================================================
-- Run this in the Supabase SQL Editor before enabling persisted full integrity
-- runs. All statements are idempotent and do not reset existing catalog data.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. New table: public.collatz_integrity_runs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.collatz_integrity_runs (
    id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    status                   text         NOT NULL CHECK (status IN ('passed', 'failed', 'warning')),
    checked_at               timestamptz  NOT NULL DEFAULT now(),
    highest_verified_n       bigint,
    numbers_cataloged        bigint,
    checks_passed            integer,
    checks_failed            integer,
    duplicate_count          integer,
    missing_range_count      integer,
    state_matches_catalog    boolean,
    highest_peak_matches     boolean,
    longest_steps_matches    boolean,
    heartbeat_recent         boolean,
    engine_status            text,
    duration_ms              integer,
    summary                  jsonb        NOT NULL DEFAULT '{}'::jsonb,
    error_message            text,
    created_at               timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.collatz_integrity_runs IS 'Append-only summaries from full Collatz catalog integrity verification runs.';
COMMENT ON COLUMN public.collatz_integrity_runs.status IS 'Overall verification status: passed, failed, or warning.';
COMMENT ON COLUMN public.collatz_integrity_runs.summary IS 'Public-safe structured verification detail, including check names and bounded samples.';


-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_integrity_runs_checked_at
    ON public.collatz_integrity_runs (checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_runs_status
    ON public.collatz_integrity_runs (status);


-- ---------------------------------------------------------------------------
-- 3. Permissions and RLS
-- ---------------------------------------------------------------------------
-- Public clients may read integrity summaries through the API layer. Inserts are
-- reserved for server-side jobs using service credentials.

GRANT SELECT ON public.collatz_integrity_runs TO anon;
GRANT SELECT ON public.collatz_integrity_runs TO authenticated;
GRANT SELECT, INSERT ON public.collatz_integrity_runs TO service_role;

ALTER TABLE public.collatz_integrity_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collatz_integrity_runs_public_select
    ON public.collatz_integrity_runs;

CREATE POLICY collatz_integrity_runs_public_select
    ON public.collatz_integrity_runs
    FOR SELECT
    TO anon, authenticated
    USING (true);


-- ---------------------------------------------------------------------------
-- 4. Worker health history
-- ---------------------------------------------------------------------------
-- Phase 11 reuses public.collatz_activity_logs for operational health events
-- instead of creating a parallel event table. Health entries use event_type
-- values such as heartbeat_ok, heartbeat_delayed, worker_stalled,
-- worker_recovered, verification_passed, and verification_failed, with severity
-- and observed context stored in metadata.


-- =============================================================================
-- Done. Verify with:
--   SELECT COUNT(*) FROM public.collatz_integrity_runs;
--   SELECT * FROM public.collatz_integrity_runs ORDER BY checked_at DESC LIMIT 1;
-- =============================================================================
