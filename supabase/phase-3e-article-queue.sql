-- Phase 3E: Article Queue and Metadata
-- Run after phase-3d-autonomous-observatory.sql.
-- Safe to run multiple times (IF NOT EXISTS / IF column does not exist).
--
-- Why this migration exists:
--   Adds SEO metadata, slug, category, and scheduling fields to ai_drafts so
--   articles can be queued for future publication and carry full metadata for
--   public Observatory display.

-- ── Additional ai_drafts columns ──────────────────────────────────────────────

ALTER TABLE ai_drafts
  ADD COLUMN IF NOT EXISTS slug                TEXT,
  ADD COLUMN IF NOT EXISTS seo_title           TEXT,
  ADD COLUMN IF NOT EXISTS seo_description     TEXT,
  ADD COLUMN IF NOT EXISTS category            TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_provider TEXT,
  ADD COLUMN IF NOT EXISTS generation_model    TEXT;

-- Index for the article queue view (scheduled articles sorted by date).
CREATE INDEX IF NOT EXISTS idx_ai_drafts_scheduled_at
  ON ai_drafts(scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ── Service-role grants ───────────────────────────────────────────────────────
GRANT ALL ON ai_drafts TO service_role;
