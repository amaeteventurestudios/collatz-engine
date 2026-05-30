-- Phase 3F: AI Observatory Settings — Production Fix
-- Self-contained. Can be run independently of other migrations.
-- Safe to run multiple times (CREATE TABLE IF NOT EXISTS; idempotent seed).
--
-- Root cause this fixes:
--   "Could not find the table 'public.ai_observatory_settings' in the schema cache"
--   The table was never created because phase-3d was not run in Supabase.
--
-- Instructions:
--   1. Paste this entire file into the Supabase SQL Editor.
--   2. Click "Run".
--   3. Verify the output shows no errors.
--   4. The NOTIFY at the end forces the PostgREST schema cache to reload.
--      If settings still fail after running, wait 30 seconds and try again.

-- ── Create the settings table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_observatory_settings (
  id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One of: manual | semi_auto | autonomous | emergency_hold
  publishing_mode                 TEXT        NOT NULL DEFAULT 'manual',

  -- Required disclosure appended to all auto-generated content.
  disclosure_text                 TEXT        NOT NULL DEFAULT
    'This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.',

  -- Content Radar: scan engine state for topic suggestions automatically.
  auto_topic_detection_enabled    BOOLEAN     NOT NULL DEFAULT true,

  -- Draft generation: auto-populate body when a Content Radar draft is created.
  auto_draft_generation_enabled   BOOLEAN     NOT NULL DEFAULT false,

  -- Image generation: auto-generate image when a draft is created.
  auto_image_generation_enabled   BOOLEAN     NOT NULL DEFAULT false,

  -- Auto-publish: publish drafts that pass all guardrails (autonomous mode only).
  auto_publish_enabled            BOOLEAN     NOT NULL DEFAULT false,

  -- Rate limit for autonomous publishing.
  max_auto_posts_per_day          INTEGER     NOT NULL DEFAULT 1
                                  CONSTRAINT ck_max_auto_posts CHECK (max_auto_posts_per_day BETWEEN 0 AND 10),

  -- Per-trigger flags.
  weekly_report_enabled           BOOLEAN     NOT NULL DEFAULT true,
  record_trigger_enabled          BOOLEAN     NOT NULL DEFAULT true,
  near_escape_trigger_enabled     BOOLEAN     NOT NULL DEFAULT true,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add CHECK constraint on publishing_mode (idempotent via DO block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ck_publishing_mode'
      AND table_name = 'ai_observatory_settings'
  ) THEN
    ALTER TABLE ai_observatory_settings
      ADD CONSTRAINT ck_publishing_mode
      CHECK (publishing_mode IN ('manual', 'semi_auto', 'autonomous', 'emergency_hold'));
  END IF;
END $$;

-- ── Service-role access ───────────────────────────────────────────────────────
-- service_role is used by the Next.js admin server actions.
-- anon must not be able to read or write observatory settings.
GRANT ALL ON ai_observatory_settings TO service_role;

-- ── Seed default row ──────────────────────────────────────────────────────────
-- Only inserts if the table is empty.
INSERT INTO ai_observatory_settings (
  publishing_mode,
  disclosure_text,
  auto_topic_detection_enabled,
  auto_draft_generation_enabled,
  auto_image_generation_enabled,
  auto_publish_enabled,
  max_auto_posts_per_day,
  weekly_report_enabled,
  record_trigger_enabled,
  near_escape_trigger_enabled
)
SELECT
  'manual',
  'This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.',
  true,
  false,
  false,
  false,
  1,
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM ai_observatory_settings LIMIT 1);

-- ── Force PostgREST schema cache reload ───────────────────────────────────────
-- Without this, PostgREST may not see the new table until its next automatic
-- refresh (up to 10 minutes on some Supabase plans).
NOTIFY pgrst, 'reload schema';
