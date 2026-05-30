-- Phase 3G: Permanent All-Time Collatz Records
-- Self-contained and safe to run multiple times.
--
-- Purpose:
--   Preserve true all-time leaderboard candidates separately from the rolling
--   collatz_results retained buffer. Normal cleanup must never touch this table.

CREATE TABLE IF NOT EXISTS public.collatz_all_time_records (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_category    TEXT        NOT NULL,
  starting_number    BIGINT      NOT NULL,
  steps              INTEGER     NOT NULL,
  peak_value         NUMERIC     NOT NULL,
  rank_scope         TEXT        NOT NULL DEFAULT 'all_time',
  source             TEXT        NOT NULL DEFAULT 'live_worker',
  source_batch_start BIGINT,
  source_batch_end   BIGINT,
  discovered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT ck_collatz_all_time_record_category
    CHECK (record_category IN ('longest_trajectory', 'highest_peak')),
  CONSTRAINT ck_collatz_all_time_rank_scope
    CHECK (rank_scope = 'all_time'),
  CONSTRAINT uq_collatz_all_time_category_start
    UNIQUE (record_category, starting_number)
);

CREATE INDEX IF NOT EXISTS idx_collatz_all_time_records_category
  ON public.collatz_all_time_records (record_category);

CREATE INDEX IF NOT EXISTS idx_collatz_all_time_records_steps_desc
  ON public.collatz_all_time_records (steps DESC);

CREATE INDEX IF NOT EXISTS idx_collatz_all_time_records_peak_desc
  ON public.collatz_all_time_records (peak_value DESC);

CREATE INDEX IF NOT EXISTS idx_collatz_all_time_records_category_steps_desc
  ON public.collatz_all_time_records (record_category, steps DESC);

CREATE INDEX IF NOT EXISTS idx_collatz_all_time_records_category_peak_desc
  ON public.collatz_all_time_records (record_category, peak_value DESC);

CREATE OR REPLACE FUNCTION public.set_collatz_all_time_records_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collatz_all_time_records_updated_at
  ON public.collatz_all_time_records;

CREATE TRIGGER trg_collatz_all_time_records_updated_at
BEFORE UPDATE ON public.collatz_all_time_records
FOR EACH ROW
EXECUTE FUNCTION public.set_collatz_all_time_records_updated_at();

-- Public dashboard reads records. Mutations go through SECURITY DEFINER RPCs.
GRANT SELECT ON public.collatz_all_time_records TO anon;
GRANT SELECT ON public.collatz_all_time_records TO authenticated;
GRANT ALL ON public.collatz_all_time_records TO service_role;

ALTER TABLE public.collatz_all_time_records DISABLE ROW LEVEL SECURITY;

-- Seed only from trustworthy retained buffer rows. This does not manufacture
-- missing historical starting numbers from collatz_engine_state.
INSERT INTO public.collatz_all_time_records (
  record_category,
  starting_number,
  steps,
  peak_value,
  source,
  discovered_at
)
SELECT
  'longest_trajectory',
  r.n,
  r.steps,
  r.peak,
  'retained_buffer_seed',
  COALESCE(r.created_at, NOW())
FROM (
  SELECT n, steps, peak, created_at
  FROM public.collatz_results
  ORDER BY steps DESC, n ASC
  LIMIT 1000
) AS r
WHERE to_regclass('public.collatz_results') IS NOT NULL
ON CONFLICT (record_category, starting_number) DO UPDATE
SET
  steps = GREATEST(public.collatz_all_time_records.steps, EXCLUDED.steps),
  peak_value = GREATEST(public.collatz_all_time_records.peak_value, EXCLUDED.peak_value),
  updated_at = NOW();

INSERT INTO public.collatz_all_time_records (
  record_category,
  starting_number,
  steps,
  peak_value,
  source,
  discovered_at
)
SELECT
  'highest_peak',
  r.n,
  r.steps,
  r.peak,
  'retained_buffer_seed',
  COALESCE(r.created_at, NOW())
FROM (
  SELECT n, steps, peak, created_at
  FROM public.collatz_results
  ORDER BY peak DESC, n ASC
  LIMIT 1000
) AS r
WHERE to_regclass('public.collatz_results') IS NOT NULL
ON CONFLICT (record_category, starting_number) DO UPDATE
SET
  steps = GREATEST(public.collatz_all_time_records.steps, EXCLUDED.steps),
  peak_value = GREATEST(public.collatz_all_time_records.peak_value, EXCLUDED.peak_value),
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.prune_collatz_all_time_records(
  p_category text,
  p_keep integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer := 0;
BEGIN
  IF p_category NOT IN ('longest_trajectory', 'highest_peak') THEN
    RAISE EXCEPTION 'Invalid record category: %', p_category;
  END IF;

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY record_category
        ORDER BY
          CASE WHEN p_category = 'longest_trajectory' THEN steps END DESC NULLS LAST,
          CASE WHEN p_category = 'highest_peak' THEN peak_value END DESC NULLS LAST,
          starting_number ASC
      ) AS rn
    FROM public.collatz_all_time_records
    WHERE record_category = p_category
  )
  DELETE FROM public.collatz_all_time_records r
  USING ranked
  WHERE r.id = ranked.id
    AND ranked.rn > GREATEST(p_keep, 0);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_collatz_all_time_record_candidate(
  p_record_category text,
  p_starting_number bigint,
  p_steps integer,
  p_peak_value numeric,
  p_source text DEFAULT 'live_worker',
  p_source_batch_start bigint DEFAULT NULL,
  p_source_batch_end bigint DEFAULT NULL,
  p_keep integer DEFAULT 1000
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer := 0;
  v_threshold numeric := NULL;
  v_should_insert boolean := false;
BEGIN
  IF p_record_category NOT IN ('longest_trajectory', 'highest_peak') THEN
    RAISE EXCEPTION 'Invalid record category: %', p_record_category;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.collatz_all_time_records
  WHERE record_category = p_record_category;

  IF v_count < p_keep THEN
    v_should_insert := true;
  ELSE
    IF p_record_category = 'longest_trajectory' THEN
      SELECT min(steps) INTO v_threshold
      FROM (
        SELECT steps
        FROM public.collatz_all_time_records
        WHERE record_category = p_record_category
        ORDER BY steps DESC, starting_number ASC
        LIMIT p_keep
      ) AS top_records;

      v_should_insert := p_steps >= COALESCE(v_threshold, 0);
    ELSE
      SELECT min(peak_value) INTO v_threshold
      FROM (
        SELECT peak_value
        FROM public.collatz_all_time_records
        WHERE record_category = p_record_category
        ORDER BY peak_value DESC, starting_number ASC
        LIMIT p_keep
      ) AS top_records;

      v_should_insert := p_peak_value >= COALESCE(v_threshold, 0);
    END IF;
  END IF;

  IF NOT v_should_insert THEN
    RETURN false;
  END IF;

  INSERT INTO public.collatz_all_time_records (
    record_category,
    starting_number,
    steps,
    peak_value,
    source,
    source_batch_start,
    source_batch_end
  )
  VALUES (
    p_record_category,
    p_starting_number,
    p_steps,
    p_peak_value,
    p_source,
    p_source_batch_start,
    p_source_batch_end
  )
  ON CONFLICT (record_category, starting_number) DO UPDATE
  SET
    steps = GREATEST(public.collatz_all_time_records.steps, EXCLUDED.steps),
    peak_value = GREATEST(public.collatz_all_time_records.peak_value, EXCLUDED.peak_value),
    source_batch_start = COALESCE(EXCLUDED.source_batch_start, public.collatz_all_time_records.source_batch_start),
    source_batch_end = COALESCE(EXCLUDED.source_batch_end, public.collatz_all_time_records.source_batch_end),
    updated_at = NOW();

  PERFORM public.prune_collatz_all_time_records(p_record_category, p_keep);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.preserve_collatz_all_time_record_candidates(
  p_record_category text,
  p_candidates jsonb,
  p_source text DEFAULT 'live_worker',
  p_source_batch_start bigint DEFAULT NULL,
  p_source_batch_end bigint DEFAULT NULL,
  p_keep integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_candidate jsonb;
  v_preserved integer := 0;
  v_count integer := 0;
  v_threshold numeric := NULL;
  v_should_insert boolean;
BEGIN
  IF p_record_category NOT IN ('longest_trajectory', 'highest_peak') THEN
    RAISE EXCEPTION 'Invalid record category: %', p_record_category;
  END IF;

  IF jsonb_typeof(p_candidates) <> 'array' THEN
    RAISE EXCEPTION 'p_candidates must be a JSON array';
  END IF;

  FOR v_candidate IN SELECT value FROM jsonb_array_elements(p_candidates)
  LOOP
    SELECT count(*) INTO v_count
    FROM public.collatz_all_time_records
    WHERE record_category = p_record_category;

    IF v_count < p_keep THEN
      v_should_insert := true;
    ELSE
      IF p_record_category = 'longest_trajectory' THEN
        SELECT min(steps) INTO v_threshold
        FROM (
          SELECT steps
          FROM public.collatz_all_time_records
          WHERE record_category = p_record_category
          ORDER BY steps DESC, starting_number ASC
          LIMIT p_keep
        ) AS top_records;

        v_should_insert := ((v_candidate ->> 'steps')::integer >= COALESCE(v_threshold, 0));
      ELSE
        SELECT min(peak_value) INTO v_threshold
        FROM (
          SELECT peak_value
          FROM public.collatz_all_time_records
          WHERE record_category = p_record_category
          ORDER BY peak_value DESC, starting_number ASC
          LIMIT p_keep
        ) AS top_records;

        v_should_insert := ((v_candidate ->> 'peak_value')::numeric >= COALESCE(v_threshold, 0));
      END IF;
    END IF;

    IF v_should_insert THEN
      INSERT INTO public.collatz_all_time_records (
        record_category,
        starting_number,
        steps,
        peak_value,
        source,
        source_batch_start,
        source_batch_end
      )
      VALUES (
        p_record_category,
        (v_candidate ->> 'starting_number')::bigint,
        (v_candidate ->> 'steps')::integer,
        (v_candidate ->> 'peak_value')::numeric,
        p_source,
        p_source_batch_start,
        p_source_batch_end
      )
      ON CONFLICT (record_category, starting_number) DO UPDATE
      SET
        steps = GREATEST(public.collatz_all_time_records.steps, EXCLUDED.steps),
        peak_value = GREATEST(public.collatz_all_time_records.peak_value, EXCLUDED.peak_value),
        source_batch_start = COALESCE(EXCLUDED.source_batch_start, public.collatz_all_time_records.source_batch_start),
        source_batch_end = COALESCE(EXCLUDED.source_batch_end, public.collatz_all_time_records.source_batch_end),
        updated_at = NOW();

      v_preserved := v_preserved + 1;
    END IF;
  END LOOP;

  PERFORM public.prune_collatz_all_time_records(p_record_category, p_keep);

  RETURN v_preserved;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prune_collatz_all_time_records(text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidate(text, bigint, integer, numeric, text, bigint, bigint, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidates(text, jsonb, text, bigint, bigint, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.prune_collatz_all_time_records(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidate(text, bigint, integer, numeric, text, bigint, bigint, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidate(text, bigint, integer, numeric, text, bigint, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidate(text, bigint, integer, numeric, text, bigint, bigint, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidates(text, jsonb, text, bigint, bigint, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidates(text, jsonb, text, bigint, bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preserve_collatz_all_time_record_candidates(text, jsonb, text, bigint, bigint, integer) TO service_role;

NOTIFY pgrst, 'reload schema';
