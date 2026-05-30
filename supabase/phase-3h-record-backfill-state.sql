-- Phase 3H: Historical Records Backfill State
-- Self-contained and safe to run multiple times.
--
-- Purpose:
--   Track the separate historical all-time records reconstruction job.
--   This table does not control the live Collatz engine or worker lock.

CREATE TABLE IF NOT EXISTS public.collatz_record_backfill_state (
  id                  TEXT        PRIMARY KEY DEFAULT 'main',
  status              TEXT        NOT NULL DEFAULT 'idle',
  start_number        BIGINT      NOT NULL DEFAULT 1,
  target_number       BIGINT,
  current_number      BIGINT      NOT NULL DEFAULT 1,
  processed_count     BIGINT      NOT NULL DEFAULT 0,
  top_n_limit         INTEGER     NOT NULL DEFAULT 1000,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  last_heartbeat_at   TIMESTAMPTZ,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_collatz_record_backfill_state_id
    CHECK (id = 'main'),
  CONSTRAINT ck_collatz_record_backfill_status
    CHECK (status IN ('idle', 'running', 'paused', 'completed', 'failed')),
  CONSTRAINT ck_collatz_record_backfill_start_positive
    CHECK (start_number >= 1),
  CONSTRAINT ck_collatz_record_backfill_current_positive
    CHECK (current_number >= 1),
  CONSTRAINT ck_collatz_record_backfill_processed_nonnegative
    CHECK (processed_count >= 0),
  CONSTRAINT ck_collatz_record_backfill_top_n_positive
    CHECK (top_n_limit > 0)
);

CREATE OR REPLACE FUNCTION public.set_collatz_record_backfill_state_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collatz_record_backfill_state_updated_at
  ON public.collatz_record_backfill_state;

CREATE TRIGGER trg_collatz_record_backfill_state_updated_at
BEFORE UPDATE ON public.collatz_record_backfill_state
FOR EACH ROW
EXECUTE FUNCTION public.set_collatz_record_backfill_state_updated_at();

INSERT INTO public.collatz_record_backfill_state (id)
VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- Public dashboard can read reconstruction progress. Mutations are operator-only
-- via the service role CLI script.
GRANT SELECT ON public.collatz_record_backfill_state TO anon;
GRANT SELECT ON public.collatz_record_backfill_state TO authenticated;
GRANT ALL ON public.collatz_record_backfill_state TO service_role;

ALTER TABLE public.collatz_record_backfill_state DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
