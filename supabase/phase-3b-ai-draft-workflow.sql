-- Phase 3B: Draft Queue, Draft Editor, Review Workflow, and Manual Export
-- Run this in the Supabase SQL Editor after phase-3a-ai-observatory.sql.
-- Safe to run multiple times.

ALTER TABLE ai_drafts
  ADD COLUMN IF NOT EXISTS excerpt TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS export_metadata JSONB;

CREATE TABLE IF NOT EXISTS ai_draft_audit_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id      UUID NOT NULL,
  event_type    TEXT NOT NULL,
  event_label   TEXT NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_draft_audit_events_draft
  ON ai_draft_audit_events(draft_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_content_type
  ON ai_drafts(content_type);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_published_public
  ON ai_drafts(status, published_at DESC, approved_at DESC)
  WHERE status IN ('approved', 'published');
