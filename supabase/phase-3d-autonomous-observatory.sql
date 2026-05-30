-- Phase 3D: Autonomous Observatory — Settings and Publishing Modes
-- Run in the Supabase SQL Editor after phase-3c-ai-provider-permissions.sql.
-- Safe to run multiple times.
--
-- Why this migration exists:
--   Adds the ai_observatory_settings table which stores the publishing mode
--   (Manual, Semi-Auto, Autonomous, Emergency Hold), the required disclosure text,
--   and per-trigger flags for the Content Radar autonomous publishing system.

-- ── ai_observatory_settings ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_observatory_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Publishing mode controls what happens after guardrails pass.
  --   manual:          AI creates notes/drafts only. Human approves and publishes.
  --   semi_auto:       AI detects topics and creates drafts. Human must approve before publish.
  --   autonomous:      AI detects topics, creates drafts, runs guardrails, publishes if all pass.
  --   emergency_hold:  Nothing can publish. AI may still create internal drafts/notes.
  publishing_mode                 TEXT NOT NULL DEFAULT 'semi_auto',

  -- Required disclosure text for all auto-generated content.
  disclosure_text                 TEXT NOT NULL DEFAULT
    'This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.',

  -- Topic detection: whether Content Radar generates topics from live engine data.
  auto_topic_detection_enabled    BOOLEAN NOT NULL DEFAULT true,

  -- Draft generation: whether clicking "Create Draft" auto-populates the body.
  auto_draft_generation_enabled   BOOLEAN NOT NULL DEFAULT false,

  -- Image generation: whether images are generated automatically with drafts.
  auto_image_generation_enabled   BOOLEAN NOT NULL DEFAULT false,

  -- Auto-publish: only active in 'autonomous' mode, requires all guardrails to pass.
  auto_publish_enabled            BOOLEAN NOT NULL DEFAULT false,

  -- Rate limiting: max auto-published items per day in autonomous mode.
  max_auto_posts_per_day          INTEGER NOT NULL DEFAULT 1,

  -- Per-trigger flags for which signals create topics.
  weekly_report_enabled           BOOLEAN NOT NULL DEFAULT true,
  record_trigger_enabled          BOOLEAN NOT NULL DEFAULT true,
  near_escape_trigger_enabled     BOOLEAN NOT NULL DEFAULT true,

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings row (runs only if the table is empty).
INSERT INTO ai_observatory_settings (publishing_mode, disclosure_text)
SELECT
  'semi_auto',
  'This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.'
WHERE NOT EXISTS (SELECT 1 FROM ai_observatory_settings LIMIT 1);

-- Service-role access (required; anon must not read settings).
GRANT ALL ON ai_observatory_settings TO service_role;
