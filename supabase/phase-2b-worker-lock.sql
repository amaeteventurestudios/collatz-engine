-- =============================================================================
-- Phase 2B — Database-Backed Worker Lock
-- =============================================================================
-- Prevents more than one Collatz worker from processing batches at a time
-- across all machines (iMac, laptop, Hetzner, CI).
--
-- Run this in the Supabase SQL Editor. All statements are idempotent.
-- No existing data is modified.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Worker lock table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.collatz_worker_lock (
    id                   uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_name            text         NOT NULL DEFAULT 'primary',
    worker_instance_id   text         NOT NULL,
    hostname             text,
    pid                  integer,
    acquired_at          timestamptz  NOT NULL DEFAULT now(),
    heartbeat_at         timestamptz  NOT NULL DEFAULT now(),
    expires_at           timestamptz  NOT NULL,
    released_at          timestamptz,
    status               text         NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'expired', 'released', 'force_released')),
    metadata             jsonb        NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz  NOT NULL DEFAULT now(),
    updated_at           timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.collatz_worker_lock IS
    'Distributed mutual-exclusion lock for the Collatz worker. '
    'Only one row per lock_name may have status=''active'' at a time. '
    'Historical rows (released, expired) are retained for audit.';

COMMENT ON COLUMN public.collatz_worker_lock.lock_name IS
    '''primary'' for the production lock; ''__verify__'' used by the verification script.';
COMMENT ON COLUMN public.collatz_worker_lock.worker_instance_id IS
    'Unique per process: hostname-pid-timestamp-randomhex.';
COMMENT ON COLUMN public.collatz_worker_lock.expires_at IS
    'Automatically expires if the worker dies without releasing. Extended by heartbeats.';
COMMENT ON COLUMN public.collatz_worker_lock.status IS
    'active: held; expired: TTL elapsed without heartbeat; released: clean shutdown; force_released: admin action.';


-- ---------------------------------------------------------------------------
-- 2. Partial unique index — enforces one active lock per lock_name
-- ---------------------------------------------------------------------------
-- The RPC handles expiry before insert, but this index is the hard safety net:
-- if two workers race to acquire, the loser gets a unique_violation.

CREATE UNIQUE INDEX IF NOT EXISTS idx_collatz_worker_lock_one_active
    ON public.collatz_worker_lock(lock_name)
    WHERE (status = 'active');


-- ---------------------------------------------------------------------------
-- 3. Supporting indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_collatz_worker_lock_instance
    ON public.collatz_worker_lock(worker_instance_id);

CREATE INDEX IF NOT EXISTS idx_collatz_worker_lock_created
    ON public.collatz_worker_lock(created_at DESC);


-- ---------------------------------------------------------------------------
-- 4. Permissions and RLS
-- ---------------------------------------------------------------------------

GRANT SELECT ON public.collatz_worker_lock TO anon;
GRANT SELECT ON public.collatz_worker_lock TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.collatz_worker_lock TO service_role;

ALTER TABLE public.collatz_worker_lock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collatz_worker_lock_public_select ON public.collatz_worker_lock;
CREATE POLICY collatz_worker_lock_public_select
    ON public.collatz_worker_lock
    FOR SELECT
    TO anon, authenticated
    USING (true);


-- ---------------------------------------------------------------------------
-- 5. acquire_collatz_worker_lock
-- ---------------------------------------------------------------------------
-- Atomically acquires the lock or returns the current owner.
-- Called by the worker on startup before processing any batch.
--
-- Returns:
--   { success: true,  lock: {...} }            — lock acquired
--   { success: false, reason: 'active_lock_exists', current_owner: {...} }
--   { success: false, reason: 'concurrent_acquisition' }
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.acquire_collatz_worker_lock(
    p_worker_instance_id  text,
    p_hostname            text         DEFAULT NULL,
    p_pid                 integer      DEFAULT NULL,
    p_ttl_seconds         integer      DEFAULT 30,
    p_metadata            jsonb        DEFAULT '{}'::jsonb,
    p_lock_name           text         DEFAULT 'primary'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing  RECORD;
    v_new       RECORD;
BEGIN
    -- Check for an active, non-expired lock
    SELECT * INTO v_existing
    FROM public.collatz_worker_lock
    WHERE lock_name = p_lock_name
      AND status    = 'active'
      AND expires_at > now()
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'active_lock_exists',
            'current_owner', jsonb_build_object(
                'id',                  v_existing.id,
                'worker_instance_id',  v_existing.worker_instance_id,
                'hostname',            v_existing.hostname,
                'pid',                 v_existing.pid,
                'acquired_at',         v_existing.acquired_at,
                'heartbeat_at',        v_existing.heartbeat_at,
                'expires_at',          v_existing.expires_at,
                'status',              v_existing.status
            )
        );
    END IF;

    -- Expire any stale active locks (active but past expires_at)
    UPDATE public.collatz_worker_lock
    SET status      = 'expired',
        released_at = now(),
        updated_at  = now()
    WHERE lock_name  = p_lock_name
      AND status     = 'active'
      AND expires_at <= now();

    -- Insert the new active lock; the partial unique index prevents races
    BEGIN
        INSERT INTO public.collatz_worker_lock(
            lock_name, worker_instance_id, hostname, pid,
            expires_at, metadata
        )
        VALUES (
            p_lock_name, p_worker_instance_id, p_hostname, p_pid,
            now() + (p_ttl_seconds || ' seconds')::interval,
            p_metadata
        )
        RETURNING * INTO v_new;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'concurrent_acquisition'
        );
    END;

    RETURN jsonb_build_object(
        'success', true,
        'lock', jsonb_build_object(
            'id',                  v_new.id,
            'lock_name',           v_new.lock_name,
            'worker_instance_id',  v_new.worker_instance_id,
            'hostname',            v_new.hostname,
            'pid',                 v_new.pid,
            'acquired_at',         v_new.acquired_at,
            'heartbeat_at',        v_new.heartbeat_at,
            'expires_at',          v_new.expires_at,
            'status',              v_new.status
        )
    );
END;
$$;

COMMENT ON FUNCTION public.acquire_collatz_worker_lock IS
    'Atomically acquires the named worker lock. Expires any stale active lock '
    'first, then inserts a new active row. Returns current owner on failure.';

REVOKE EXECUTE ON FUNCTION public.acquire_collatz_worker_lock FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.acquire_collatz_worker_lock TO anon;
GRANT  EXECUTE ON FUNCTION public.acquire_collatz_worker_lock TO authenticated;
GRANT  EXECUTE ON FUNCTION public.acquire_collatz_worker_lock TO service_role;


-- ---------------------------------------------------------------------------
-- 6. heartbeat_collatz_worker_lock
-- ---------------------------------------------------------------------------
-- Called by the running worker every ~10 seconds to extend the TTL.
-- Only succeeds if the caller still owns the active lock.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.heartbeat_collatz_worker_lock(
    p_worker_instance_id  text,
    p_ttl_seconds         integer  DEFAULT 30,
    p_lock_name           text     DEFAULT 'primary'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated  RECORD;
BEGIN
    UPDATE public.collatz_worker_lock
    SET heartbeat_at = now(),
        expires_at   = now() + (p_ttl_seconds || ' seconds')::interval,
        updated_at   = now()
    WHERE lock_name          = p_lock_name
      AND worker_instance_id = p_worker_instance_id
      AND status             = 'active'
      AND expires_at         > now()
    RETURNING * INTO v_updated;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'lock_not_owned_or_expired'
        );
    END IF;

    RETURN jsonb_build_object(
        'success',      true,
        'heartbeat_at', v_updated.heartbeat_at,
        'expires_at',   v_updated.expires_at
    );
END;
$$;

COMMENT ON FUNCTION public.heartbeat_collatz_worker_lock IS
    'Extends the TTL of an active lock owned by p_worker_instance_id. '
    'Returns failure if the lock is not owned or has already expired.';

REVOKE EXECUTE ON FUNCTION public.heartbeat_collatz_worker_lock FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.heartbeat_collatz_worker_lock TO anon;
GRANT  EXECUTE ON FUNCTION public.heartbeat_collatz_worker_lock TO authenticated;
GRANT  EXECUTE ON FUNCTION public.heartbeat_collatz_worker_lock TO service_role;


-- ---------------------------------------------------------------------------
-- 7. release_collatz_worker_lock
-- ---------------------------------------------------------------------------
-- Called by the worker on clean shutdown.
-- Only releases a lock owned by this worker_instance_id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.release_collatz_worker_lock(
    p_worker_instance_id  text,
    p_lock_name           text  DEFAULT 'primary'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_released  RECORD;
BEGIN
    UPDATE public.collatz_worker_lock
    SET status      = 'released',
        released_at = now(),
        updated_at  = now()
    WHERE lock_name          = p_lock_name
      AND worker_instance_id = p_worker_instance_id
      AND status             = 'active'
    RETURNING * INTO v_released;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'no_active_lock_owned_by_worker'
        );
    END IF;

    RETURN jsonb_build_object(
        'success',     true,
        'released_at', v_released.released_at
    );
END;
$$;

COMMENT ON FUNCTION public.release_collatz_worker_lock IS
    'Marks the active lock as released. Only succeeds if p_worker_instance_id '
    'owns the current active lock. Safe to call even if already released.';

REVOKE EXECUTE ON FUNCTION public.release_collatz_worker_lock FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_collatz_worker_lock TO anon;
GRANT  EXECUTE ON FUNCTION public.release_collatz_worker_lock TO authenticated;
GRANT  EXECUTE ON FUNCTION public.release_collatz_worker_lock TO service_role;


-- ---------------------------------------------------------------------------
-- 8. force_release_collatz_worker_lock
-- ---------------------------------------------------------------------------
-- Admin-only action: releases the active lock regardless of who owns it.
-- Requires service_role credentials. Used from the admin dashboard or
-- when a worker has died without releasing its lock.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.force_release_collatz_worker_lock(
    p_lock_name  text  DEFAULT 'primary'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_released  RECORD;
BEGIN
    UPDATE public.collatz_worker_lock
    SET status      = 'force_released',
        released_at = now(),
        updated_at  = now()
    WHERE lock_name = p_lock_name
      AND status    = 'active'
    RETURNING * INTO v_released;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason',  'no_active_lock'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'released_lock', jsonb_build_object(
            'id',                  v_released.id,
            'worker_instance_id',  v_released.worker_instance_id,
            'hostname',            v_released.hostname,
            'pid',                 v_released.pid,
            'acquired_at',         v_released.acquired_at,
            'released_at',         v_released.released_at,
            'status',              v_released.status
        )
    );
END;
$$;

COMMENT ON FUNCTION public.force_release_collatz_worker_lock IS
    'Admin/service_role only. Force-releases the active lock regardless of owner. '
    'Use from the admin dashboard or when a dead worker left an orphaned lock.';

REVOKE EXECUTE ON FUNCTION public.force_release_collatz_worker_lock FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.force_release_collatz_worker_lock FROM anon;
REVOKE EXECUTE ON FUNCTION public.force_release_collatz_worker_lock FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.force_release_collatz_worker_lock TO service_role;


-- =============================================================================
-- Done. Verify with:
--   SELECT routine_name FROM information_schema.routines
--     WHERE routine_schema = 'public'
--       AND routine_name LIKE '%collatz_worker_lock%';
--   SELECT * FROM public.collatz_worker_lock ORDER BY created_at DESC LIMIT 5;
-- =============================================================================
