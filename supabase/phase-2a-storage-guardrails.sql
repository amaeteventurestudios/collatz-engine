-- =============================================================================
-- Phase 2A — Emergency Storage Guardrails + Runtime Config
-- =============================================================================
-- Run this in the Supabase SQL Editor.
-- All statements are idempotent. No existing data is deleted.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Runtime config table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.collatz_engine_runtime_config (
    id                           text         PRIMARY KEY DEFAULT 'main',
    mode                         text         NOT NULL DEFAULT 'recovery',
    batch_size                   integer      NOT NULL DEFAULT 25,
    batch_delay_ms               integer      NOT NULL DEFAULT 10000,
    log_interval_ms              integer      NOT NULL DEFAULT 60000,
    storage_mode                 text         NOT NULL DEFAULT 'free-tier',
    keep_recent_results          integer      NOT NULL DEFAULT 1000,
    activity_log_retention_rows  integer      NOT NULL DEFAULT 250,
    range_summary_interval       integer      NOT NULL DEFAULT 100000,
    milestone_interval           integer      NOT NULL DEFAULT 1000000,
    auto_throttle_enabled        boolean      NOT NULL DEFAULT true,
    pause_on_critical_storage    boolean      NOT NULL DEFAULT true,
    updated_at                   timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.collatz_engine_runtime_config IS 'Single-row live runtime config for the Collatz worker. Conservative defaults protect Supabase free tier.';
COMMENT ON COLUMN public.collatz_engine_runtime_config.mode IS 'recovery | safe | normal — preset label, informational only.';
COMMENT ON COLUMN public.collatz_engine_runtime_config.keep_recent_results IS 'Max rows to keep in collatz_results. Older rows (lowest n) are pruned.';
COMMENT ON COLUMN public.collatz_engine_runtime_config.activity_log_retention_rows IS 'Max rows to keep in collatz_activity_logs. Older rows are pruned.';

-- Permissions
GRANT SELECT ON public.collatz_engine_runtime_config TO anon;
GRANT SELECT ON public.collatz_engine_runtime_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collatz_engine_runtime_config TO service_role;

ALTER TABLE public.collatz_engine_runtime_config DISABLE ROW LEVEL SECURITY;

-- Seed conservative recovery defaults (does not overwrite if row already exists)
INSERT INTO public.collatz_engine_runtime_config (
    id, mode, batch_size, batch_delay_ms, log_interval_ms,
    storage_mode, keep_recent_results, activity_log_retention_rows,
    range_summary_interval, milestone_interval,
    auto_throttle_enabled, pause_on_critical_storage, updated_at
) VALUES (
    'main', 'recovery', 25, 10000, 60000,
    'free-tier', 1000, 250,
    100000, 1000000,
    true, true, now()
) ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. Cleanup RPC — safe retention trimming
-- ---------------------------------------------------------------------------
-- Uses n DESC to identify "recent" results (highest n = most recent).
-- Uses created_at DESC for activity logs.
-- All deletes are bounded and safe. Never touches engine state.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_collatz_storage(
    p_keep_results integer DEFAULT 1000,
    p_keep_logs    integer DEFAULT 250
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_results_before  bigint := 0;
    v_logs_before     bigint := 0;
    v_results_after   bigint := 0;
    v_logs_after      bigint := 0;
    v_cutoff_n        bigint;
    v_cutoff_ts       timestamptz;
BEGIN
    -- Count before
    IF to_regclass('public.collatz_results') IS NOT NULL THEN
        SELECT count(*) INTO v_results_before FROM public.collatz_results;
    END IF;
    IF to_regclass('public.collatz_activity_logs') IS NOT NULL THEN
        SELECT count(*) INTO v_logs_before FROM public.collatz_activity_logs;
    END IF;

    -- Prune collatz_results: keep the p_keep_results rows with the highest n
    IF to_regclass('public.collatz_results') IS NOT NULL AND v_results_before > p_keep_results THEN
        SELECT n INTO v_cutoff_n
        FROM public.collatz_results
        ORDER BY n DESC
        OFFSET greatest(p_keep_results, 0)
        LIMIT 1;

        IF v_cutoff_n IS NOT NULL THEN
            DELETE FROM public.collatz_results WHERE n <= v_cutoff_n;
        END IF;
    END IF;

    -- Prune collatz_activity_logs: keep the p_keep_logs most recent rows
    IF to_regclass('public.collatz_activity_logs') IS NOT NULL AND v_logs_before > p_keep_logs THEN
        SELECT created_at INTO v_cutoff_ts
        FROM public.collatz_activity_logs
        ORDER BY created_at DESC
        OFFSET greatest(p_keep_logs, 0)
        LIMIT 1;

        IF v_cutoff_ts IS NOT NULL THEN
            DELETE FROM public.collatz_activity_logs WHERE created_at <= v_cutoff_ts;
        END IF;
    END IF;

    -- Count after
    IF to_regclass('public.collatz_results') IS NOT NULL THEN
        SELECT count(*) INTO v_results_after FROM public.collatz_results;
    END IF;
    IF to_regclass('public.collatz_activity_logs') IS NOT NULL THEN
        SELECT count(*) INTO v_logs_after FROM public.collatz_activity_logs;
    END IF;

    RETURN jsonb_build_object(
        'results_before',  v_results_before,
        'results_after',   v_results_after,
        'results_deleted', v_results_before - v_results_after,
        'logs_before',     v_logs_before,
        'logs_after',      v_logs_after,
        'logs_deleted',    v_logs_before - v_logs_after,
        'ran_at',          now()
    );
END;
$$;

COMMENT ON FUNCTION public.cleanup_collatz_storage IS
    'Trims collatz_results to the most recent p_keep_results rows (by n) '
    'and collatz_activity_logs to the most recent p_keep_logs rows. '
    'Never touches collatz_engine_state, integrity_runs, or milestone tables.';

-- Grant execute to service_role only (called from admin server actions)
REVOKE EXECUTE ON FUNCTION public.cleanup_collatz_storage FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_collatz_storage FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_collatz_storage FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_collatz_storage TO service_role;


-- ---------------------------------------------------------------------------
-- 3. Inline prune helper — fast path for worker (anon key compatible)
-- ---------------------------------------------------------------------------
-- Called after every batch in free-tier mode to keep collatz_results bounded.
-- Does NOT touch activity logs (those are pruned by the full cleanup RPC).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prune_results_to_limit(p_keep integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count  bigint;
    v_cutoff bigint;
    v_deleted integer := 0;
BEGIN
    SELECT count(*) INTO v_count FROM public.collatz_results;
    IF v_count <= p_keep THEN
        RETURN 0;
    END IF;

    SELECT n INTO v_cutoff
    FROM public.collatz_results
    ORDER BY n DESC
    OFFSET greatest(p_keep, 0)
    LIMIT 1;

    IF v_cutoff IS NOT NULL THEN
        DELETE FROM public.collatz_results WHERE n <= v_cutoff;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
    END IF;

    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION public.prune_results_to_limit IS
    'Lightweight inline prune: keeps the p_keep rows with the highest n. '
    'Called from the worker after each batch in free-tier storage mode.';

-- Accessible by anon so worker (which uses anon key) can call it
GRANT EXECUTE ON FUNCTION public.prune_results_to_limit TO anon;
GRANT EXECUTE ON FUNCTION public.prune_results_to_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_results_to_limit TO service_role;


-- =============================================================================
-- Done.
-- Verify:
--   SELECT * FROM public.collatz_engine_runtime_config;
--   SELECT routine_name FROM information_schema.routines
--     WHERE routine_schema = 'public' AND routine_name IN (
--       'cleanup_collatz_storage', 'prune_results_to_limit'
--     );
-- =============================================================================
