-- Phase 3A: AI Observatory Foundation
-- Run this in the Supabase SQL Editor.
-- Safe to run multiple times (uses IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).

-- ── ai_providers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name       TEXT NOT NULL UNIQUE,
  display_name        TEXT NOT NULL,
  enabled             BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted   TEXT,
  api_key_masked      TEXT,
  last_tested_at      TIMESTAMPTZ,
  last_test_status    TEXT NOT NULL DEFAULT 'untested',
  last_test_message   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default providers
INSERT INTO ai_providers (provider_name, display_name, enabled, last_test_status)
VALUES
  ('openai',     'OpenAI',             false, 'untested'),
  ('anthropic',  'Anthropic / Claude', false, 'untested'),
  ('openrouter', 'OpenRouter',         false, 'untested'),
  ('gemini',     'Google Gemini',      false, 'untested')
ON CONFLICT (provider_name) DO NOTHING;

-- ── ai_model_settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_model_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type     TEXT NOT NULL UNIQUE,
  provider_name TEXT NOT NULL DEFAULT 'anthropic',
  model_name    TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  temperature   NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  max_tokens    INTEGER NOT NULL DEFAULT 2048,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default model settings
INSERT INTO ai_model_settings (task_type, provider_name, model_name, temperature, max_tokens)
VALUES
  ('notes',     'anthropic', 'claude-opus-4-8',           0.3, 1000),
  ('drafts',    'anthropic', 'claude-opus-4-8',           0.5, 4000),
  ('reports',   'anthropic', 'claude-opus-4-8',           0.3, 6000),
  ('social',    'anthropic', 'claude-sonnet-4-6',         0.6, 1000),
  ('images',    'openai',    'dall-e-3',                   0.0,    0),
  ('summaries', 'anthropic', 'claude-haiku-4-5-20251001', 0.3,  500),
  ('headlines', 'anthropic', 'claude-haiku-4-5-20251001', 0.5,  200)
ON CONFLICT (task_type) DO NOTHING;

-- ── ai_brand_voice_profiles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_brand_voice_profiles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL,
  is_default               BOOLEAN NOT NULL DEFAULT false,
  voice_summary            TEXT,
  long_form_instructions   TEXT,
  social_instructions      TEXT,
  image_style_instructions TEXT,
  preferred_phrases        TEXT[] DEFAULT '{}',
  phrases_to_avoid         TEXT[] DEFAULT '{}',
  formatting_rules         TEXT,
  good_examples            TEXT,
  bad_examples             TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default brand voice
INSERT INTO ai_brand_voice_profiles (
  name, is_default, voice_summary, long_form_instructions, social_instructions,
  image_style_instructions, preferred_phrases, phrases_to_avoid, formatting_rules
)
VALUES (
  'Collatz Engine Voice',
  true,
  'Serious, research-grade, plain English. Transparent about uncertainty. No proof claims, no hype.',
  'Write clearly and directly. Describe computations as observations, not proofs. Always note results are computational, not mathematical proofs. Be specific with numbers. Write for a technically literate audience.',
  'Brief and factual. Lead with the data point. Do not hype. Do not claim proof. Sound like a scientist sharing interesting data.',
  'Dark scientific observatory aesthetic. Collatz trajectory visuals. Teal/cyan/blue on dark backgrounds. No conjecture solved imagery.',
  ARRAY['verified by computation','all trajectories reached 1','computational observation','consistent with the conjecture','this is not a proof'],
  ARRAY['proves the conjecture','solves the Collatz problem','breakthrough','definitive proof','conjecture solved'],
  'Short paragraphs (3-4 sentences). Bold important numbers. Always include a disclaimer section for public posts.'
)
ON CONFLICT DO NOTHING;

-- ── ai_prompt_templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_prompt_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type       TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  template_body       TEXT NOT NULL,
  required_variables  TEXT[] DEFAULT '{}',
  enabled             BOOLEAN NOT NULL DEFAULT true,
  version             INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_image_presets ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_image_presets (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  target              TEXT NOT NULL,
  width               INTEGER NOT NULL,
  height              INTEGER NOT NULL,
  aspect_ratio        TEXT NOT NULL,
  provider_name       TEXT NOT NULL DEFAULT 'openai',
  model_name          TEXT NOT NULL DEFAULT 'dall-e-3',
  style_prompt        TEXT,
  allow_text_overlay  BOOLEAN NOT NULL DEFAULT true,
  required            BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed image presets
INSERT INTO ai_image_presets (name, target, width, height, aspect_ratio, style_prompt, allow_text_overlay, required)
VALUES
  ('Blog / Ghost Hero',       'ghost',             1200, 630,  '1.91:1', 'Dark scientific observatory dashboard, mathematical trajectory visualization, teal and cyan glowing lines on deep dark background, mission-control aesthetic', true,  true),
  ('Substack Cover',          'substack',          1456, 1048, '1.39:1', 'Mathematical observatory at night, abstract number sequences flowing as light trails, dark blue and teal gradient, scientific research aesthetic', true,  true),
  ('LinkedIn Post Image',     'linkedin_post',     1200, 627,  '1.91:1', 'Professional dark theme data visualization, abstract mathematical graph, teal accent lines, clean minimal scientific aesthetic', true,  false),
  ('LinkedIn Article Cover',  'linkedin_article',  1200, 627,  '1.91:1', 'Mathematical research article cover, dark observatory aesthetic, trajectory plots, teal/cyan glow, sophisticated and minimal', true,  true),
  ('X Post Image',            'x_post',            1600, 900,  '16:9',   'Dark minimalist data visualization, Collatz mathematical pattern, abstract spiral or trajectory graph, teal on black', true,  false),
  ('X Thread Image',          'x_thread',          1600, 900,  '16:9',   'Mathematical computation visualization, dark background with teal data streams, abstract sequence diagram', false, false),
  ('Observatory Report Hero', 'observatory_report',1600, 900,  '16:9',   'Grand scientific observatory building at night, mathematical equations floating as light particles, dramatic dark atmosphere, teal and indigo luminescence', true,  true),
  ('Website Card',            'website',           1200, 630,  '1.91:1', 'Abstract Collatz sequence visualization, dark web card image, teal glowing mathematical paths, minimal modern scientific aesthetic', true,  false)
ON CONFLICT DO NOTHING;

-- ── ai_publishing_profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_publishing_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        TEXT NOT NULL,
  target                      TEXT NOT NULL,
  content_type                TEXT NOT NULL,
  default_prompt_template_id  UUID,
  default_image_preset_id     UUID,
  requires_image              BOOLEAN NOT NULL DEFAULT false,
  requires_human_approval     BOOLEAN NOT NULL DEFAULT true,
  output_format               TEXT NOT NULL DEFAULT 'markdown',
  min_words                   INTEGER NOT NULL DEFAULT 0,
  max_words                   INTEGER NOT NULL DEFAULT 2000,
  cta_style                   TEXT,
  enabled                     BOOLEAN NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed publishing profiles
INSERT INTO ai_publishing_profiles (name, target, content_type, requires_image, output_format, min_words, max_words, cta_style)
VALUES
  ('Ghost Blog Post',           'ghost',        'blog_post',           true,  'markdown',   400,  1200, 'View the full engine dashboard'),
  ('Substack Post',             'substack',     'blog_post',           true,  'markdown',   300,  1000, 'Subscribe for weekly engine updates'),
  ('LinkedIn Post',             'linkedin',     'linkedin_post',       false, 'plain_text',  80,   300, 'Link to full report'),
  ('LinkedIn Article',          'linkedin',     'linkedin_article',    true,  'markdown',   600,  2000, 'Explore the Collatz Engine'),
  ('X Post',                    'x',            'x_post',              false, 'plain_text',  20,    60, 'Link to report'),
  ('X Thread',                  'x',            'x_thread',            true,  'thread',     100,   400, 'Follow for updates'),
  ('Weekly Observatory Report', 'website',      'weekly_report',       true,  'markdown',   500,  1500, 'View full engine dashboard'),
  ('Export Markdown',           'export_files', 'blog_post',           false, 'markdown',     0, 99999, '')
ON CONFLICT DO NOTHING;

-- ── ai_notes ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  note_type           TEXT NOT NULL DEFAULT 'system',
  body                TEXT NOT NULL DEFAULT '',
  source_event_type   TEXT,
  source_data         JSONB,
  severity            TEXT NOT NULL DEFAULT 'info',
  status              TEXT NOT NULL DEFAULT 'new',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_drafts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_drafts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT NOT NULL,
  content_type            TEXT NOT NULL DEFAULT 'blog_post',
  body_markdown           TEXT,
  body_plain_text         TEXT,
  body_html               TEXT,
  image_prompt            TEXT,
  image_url               TEXT,
  image_preset_id         UUID,
  publishing_profile_id   UUID,
  source_note_id          UUID,
  source_data             JSONB,
  status                  TEXT NOT NULL DEFAULT 'draft',
  guardrail_status        TEXT,
  review_notes            TEXT,
  approved_at             TIMESTAMPTZ,
  published_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_generated_images ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_generated_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id      UUID,
  provider_name TEXT NOT NULL,
  model_name    TEXT NOT NULL,
  prompt        TEXT NOT NULL,
  image_url     TEXT,
  width         INTEGER NOT NULL DEFAULT 1200,
  height        INTEGER NOT NULL DEFAULT 630,
  target        TEXT NOT NULL DEFAULT 'blog',
  status        TEXT NOT NULL DEFAULT 'requested',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_usage_events ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name   TEXT NOT NULL,
  model_name      TEXT NOT NULL,
  task_type       TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  image_count     INTEGER,
  estimated_cost  NUMERIC(10,6),
  status          TEXT NOT NULL DEFAULT 'ok',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_notes_status ON ai_notes(status);
CREATE INDEX IF NOT EXISTS idx_ai_notes_created ON ai_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_status ON ai_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_updated ON ai_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_draft ON ai_generated_images(draft_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created ON ai_usage_events(created_at DESC);
