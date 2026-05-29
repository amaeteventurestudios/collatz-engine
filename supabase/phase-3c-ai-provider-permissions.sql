-- Phase 3C: AI Observatory — Service-Role Grants and Provider RLS
-- Run after phase-3a-ai-observatory.sql and phase-3b-ai-draft-workflow.sql.
-- Safe to run multiple times (all statements are idempotent).
--
-- Why this migration exists:
--   The admin-store always uses the service_role Supabase client. In some
--   Supabase project configurations the default role grants are not applied to
--   tables created via the SQL editor, causing "permission denied" errors even
--   with the service_role key. This migration adds explicit grants.
--
--   Additionally, ai_providers stores encrypted API keys. RLS is enabled on that
--   table so that neither the anon nor authenticated roles can read or write
--   provider rows — all access must go through the server-side service_role client.
--   The service_role bypasses RLS in Supabase automatically; no additional policy
--   is needed for it.

-- ── 1. Explicit grants for service_role on all AI Observatory tables ──────────

GRANT ALL ON ai_providers           TO service_role;
GRANT ALL ON ai_model_settings      TO service_role;
GRANT ALL ON ai_brand_voice_profiles TO service_role;
GRANT ALL ON ai_prompt_templates    TO service_role;
GRANT ALL ON ai_image_presets       TO service_role;
GRANT ALL ON ai_publishing_profiles TO service_role;
GRANT ALL ON ai_notes               TO service_role;
GRANT ALL ON ai_drafts              TO service_role;
GRANT ALL ON ai_generated_images    TO service_role;
GRANT ALL ON ai_usage_events        TO service_role;

-- ai_draft_audit_events is added in phase-3b; guard with DO block for safety.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'ai_draft_audit_events') THEN
    EXECUTE 'GRANT ALL ON ai_draft_audit_events TO service_role';
  END IF;
END $$;

-- ── 2. Enable RLS on ai_providers to protect encrypted keys ──────────────────
--
-- With RLS enabled and no permissive policy for anon/authenticated, those roles
-- are blocked from all access. The service_role bypasses RLS and retains full
-- access without any explicit policy.

ALTER TABLE ai_providers ENABLE ROW LEVEL SECURITY;

-- Remove any pre-existing overly-permissive policies on this table.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ai_providers'
      AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['authenticated']::name[]
           OR roles @> ARRAY['public']::name[])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON ai_providers', pol.policyname);
  END LOOP;
END $$;

-- ── 3. Read-only anon grants for non-sensitive public tables ──────────────────
--
-- ai_drafts and ai_notes are read by the public Observatory page via the anon
-- Supabase client. Grant SELECT only; writes still require service_role.

GRANT SELECT ON ai_drafts TO anon, authenticated;
GRANT SELECT ON ai_notes  TO anon, authenticated;
