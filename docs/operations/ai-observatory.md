# AI Observatory — Operations Guide

## Purpose

The AI Observatory is an autonomous content desk for generating, reviewing, and publishing AI-assisted insights from verified Collatz Engine computation data.

In the default `semi_auto` mode, AI detects topics and creates drafts, but a human must approve before anything appears publicly. In `autonomous` mode, content can publish automatically if all guardrails pass.

---

## Workflow

```
Engine Data → Content Radar → Create Draft → Guardrail Check → Approve → Public Observatory
```

### Manual / Semi-Auto mode
1. Content Radar scans live engine data and surfaces publishable topics
2. Operator clicks "Create Draft" from a topic card
3. Draft is populated with required disclosure text
4. Human edits, approves, and exports

### Autonomous mode
1. Content Radar detects topics automatically
2. System creates drafts, generates images (if configured), runs guardrail checks
3. If all hard guardrails pass, draft is published to the public Observatory
4. Human reviews periodically and can revert/reject at any time

---

## Database Migrations

Run all migrations in order in the Supabase SQL Editor:

```sql
-- Phase 3A: Core observatory tables
supabase/phase-3a-ai-observatory.sql

-- Phase 3B: Draft workflow and audit events
supabase/phase-3b-ai-draft-workflow.sql

-- Phase 3C: Service-role grants and provider RLS
supabase/phase-3c-ai-provider-permissions.sql

-- Phase 3D: Autonomous observatory settings
supabase/phase-3d-autonomous-observatory.sql
```

Tables created:
- `ai_providers` — provider API key configuration (encrypted, service-role only)
- `ai_model_settings` — per-task model selection
- `ai_brand_voice_profiles` — writing voice and style
- `ai_prompt_templates` — editable generation templates
- `ai_image_presets` — platform image dimensions and style
- `ai_publishing_profiles` — content type → target mappings
- `ai_notes` — internal AI observations
- `ai_drafts` — editable draft content
- `ai_generated_images` — image generation records
- `ai_usage_events` — usage and cost tracking (future)
- `ai_draft_audit_events` — draft workflow history (Phase 3B)
- `ai_observatory_settings` — publishing mode and disclosure text (Phase 3D)

---

## API Key Security

**Never store API keys in plain text.**

Requirements:
1. Set `AI_SETTINGS_ENCRYPTION_KEY` as a 64-character hex string (= 32 bytes)
   ```bash
   # Generate with:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Add to your environment variables (Vercel, .env.local)
3. Until this is set, the provider settings UI will show a warning and disable key saving

Key handling:
- Keys are encrypted with AES-256-GCM before storage
- Only a masked version (`sk-...abcd`) is shown in the UI
- The full key is never returned to the browser
- Keys are decrypted server-side only at generation time

To rotate a key:
1. Open AI Studio → Providers
2. Click "Replace" next to the masked key
3. Enter the new key and save
4. Old key is overwritten — previous encrypted value is gone

---

## AI Providers

### OpenAI
- Capabilities: Text generation, Image generation (DALL-E 3)
- Environment fallback: `OPENAI_API_KEY`
- Used for: Blog posts, reports, social content, image generation

### Anthropic / Claude
- Capabilities: Text generation only
- Environment fallback: `ANTHROPIC_API_KEY`
- Used for: AI notes, drafts, reports, summaries, headlines

### OpenRouter, Gemini
- Configured as placeholders for future integration
- Not yet implemented in generation layer

---

## Model Selection

Each task type has its own model setting:
- `notes` — short observations (default: claude-opus-4-8, temp 0.3)
- `drafts` — full blog/report drafts (default: claude-opus-4-8, temp 0.5)
- `reports` — long-form reports (default: claude-opus-4-8, temp 0.3)
- `social` — social posts (default: claude-sonnet-4-6, temp 0.6)
- `images` — image generation (default: dall-e-3)
- `summaries` — short summaries (default: claude-haiku-4-5-20251001)
- `headlines` — headline options (default: claude-haiku-4-5-20251001)

---

## Image Generation

### Platform Dimensions

| Platform | Name | Width | Height | Aspect Ratio |
|---|---|---|---|---|
| Ghost / Blog | Blog/Ghost Hero | 1200 | 630 | 1.91:1 |
| Substack | Substack Cover | 1456 | 1048 | 1.39:1 |
| LinkedIn Post | LinkedIn Post Image | 1200 | 627 | 1.91:1 |
| LinkedIn Article | LinkedIn Article Cover | 1200 | 627 | 1.91:1 |
| X / Twitter | X Post Image | 1600 | 900 | 16:9 |
| X Thread | X Thread Image | 1600 | 900 | 16:9 |
| Observatory Report | Report Hero | 1600 | 900 | 16:9 |

The system automatically selects the correct preset for each publishing profile. Dimensions are not hardcoded — they come from the `ai_image_presets` table and can be edited in AI Studio → Image Presets.

### DALL-E 3 Size Mapping

DALL-E 3 supports: `1024x1024`, `1792x1024`, `1024x1792`

The system maps platform dimensions to the closest supported size:
- Landscape (w > h) → `1792x1024`
- Portrait (h > w) → `1024x1792`
- Square → `1024x1024`

---

## Writing Voice

The default profile "Collatz Engine Voice" defines:
- Serious, research-grade, plain English
- No proof claims
- Transparent about uncertainty
- Cite actual verified numbers
- Always include disclaimers on public content

Edit in AI Studio → Writing Voice. Changes take effect on the next generation call.

---

## Prompt Templates

Templates are editable in AI Studio → Prompt Templates.

Variables available in templates:
- `{source_data}` — verified engine data for this generation
- `{brand_voice}` — active brand voice instructions
- `{publishing_profile}` — target profile (format, word count, CTA)
- `{image_preset}` — image preset for this target
- `{title}` — content title
- `{content_type}` — blog_post, x_post, etc.
- `{image_style}` — image style from brand voice

---

## Publishing Profiles

Each profile defines:
- Target platform (ghost, substack, linkedin, x, website, export_files)
- Content type (blog_post, x_post, x_thread, etc.)
- Output format (markdown, plain_text, thread, json)
- Word count range (min/max)
- Image requirements (required/optional)
- CTA style

---

## Draft Workflow

Status flow:
```
draft → needs_review → approved → published
              ↓
           rejected → archived
```

Rules:
- Draft Queue and Draft Editor live inside `/admin/ai-observatory`; there is no separate admin sidebar item.
- Clicking a draft in Draft Queue opens the Draft Editor tab with that draft selected.
- Drafts can be saved, edited, regenerated, rejected, archived, reopened, approved, and manually exported.
- Only `approved` drafts can be marked `published` / exported.
- `published` requires the previous approved status and a `published_at` timestamp.
- Status changes are logged to `ai_draft_audit_events` when the Phase 3B migration has been run.
- Published drafts should not be edited unless reopened for review.

Editable fields:
- title
- body markdown / plain text / HTML
- excerpt
- tags
- publishing profile
- content type
- image preset
- image prompt
- review notes

Read-only fields:
- verified source data
- engine metrics
- audit metadata

---

## Guardrails

### Enforced (always active in code)
- No solution claims — flagged phrases block approval
- Human review required — enforced by status workflow
- No unsupported mathematical claims — same as above
- Audit trail — all actions timestamped
- Approval before publish — status check enforced

### Configured (enabled by settings)
- Source data attached — checked at draft save
- Disclaimers required — phrase check in content

Approval is blocked when hard guardrails fail:
- proof or solution claims are detected
- unsupported mathematical claims are detected
- required source data is missing
- approval-before-publish rules are violated
- a publishing profile requires an image and no image exists

Saving remains allowed while guardrails fail so an operator can continue editing.

---

## Image Placeholder and Generation

The Draft Editor image panel never displays fake generated images. If no real generated image URL exists, it shows a premium dark placeholder with the expected preset dimensions and setup guidance.

OpenAI image generation remains disabled until an OpenAI key is configured in AI Studio → Providers. When configured, image generation runs server-side, maps platform dimensions to a supported OpenAI image size, stores a row in `ai_generated_images`, and attaches the returned image URL to the draft.

Image prompts must include Collatz Engine context, target platform, dimensions/aspect ratio, no proof claims, no false mathematical announcements, no generic robot imagery, and the dark observatory / mission-control aesthetic.

---

## Export Formats

Available from the draft detail view:
- Copy Markdown
- Copy Plain Text
- Download .md file
- Download .txt file
- JSON export with metadata and source data
- Copy image prompt
- Copy source data JSON
- Download `.json`

For Ghost:
- Markdown with title, excerpt, tags, feature image URL

For LinkedIn:
- Plain text (no markdown formatting)

For X:
- Thread format (numbered posts)

Export is manual only in Phase 3B. Ghost, LinkedIn, X, Substack, Website, and Export Files targets explain the package they prepare; they do not directly post to third-party APIs.

---

## No Auto-Publishing Policy

The AI Observatory **never** auto-publishes. Every publication requires:
1. Human review of draft content
2. Explicit approval action
3. Manual export or publish action

This policy is enforced by the status workflow and server action guards.

---

## Public Observatory

URL: `/observatory`

Shows only content where `status = 'published'` or `status = 'approved'` from `ai_drafts`, with legacy `ai_observatory_notes` used only if no approved/public draft rows exist.

If no approved content exists, a polished empty state is shown:
"The Observatory will publish reviewed reports from verified engine activity."

The public route does not fall back to static demo notes. Draft, needs-review, rejected, and archived content are excluded.

---

## No Proof Claims Policy

The Collatz Conjecture has not been proved.

AI-generated content must:
- Describe results as "computational observations"
- Say "consistent with the conjecture" not "proves the conjecture"
- Include disclaimers on all public posts
- Never say "solved" or "proved"

Guardrail checks flag the following phrases as violations:
- "proves the conjecture"
- "conjecture is proved / proven"
- "conjecture solved"
- "definitive proof"
- "mathematical proof" (in context of Collatz results)

---

## AI Notes Workflow

AI Notes are internal observations from verified source events. Operators can:
- create manual notes
- mark notes reviewed
- archive notes
- convert notes into drafts

If a provider is configured, conversion can generate draft body text server-side. If no provider is configured, the operator can create a blank draft seeded by real note/source context. The system must not invent source data.

---

## Weekly Report Generator

The Weekly Report action creates a review draft foundation. With a configured text provider, it can generate a needs-review report from real recent engine/source data. Without a provider, it creates a structured draft shell only; it must not pretend that AI generated the report.

Recommended sections:
- engine progress
- records/highlights
- near-escape candidates
- integrity status
- operations/storage note when relevant
- no-proof disclaimer

---

## Provider Setup Troubleshooting

If provider buttons are disabled:
1. Confirm `AI_SETTINGS_ENCRYPTION_KEY` is present locally and in Vercel.
2. Redeploy after setting the encryption key.
3. Add or replace the provider key in AI Studio → Providers.
4. Use Test Connection.
5. Confirm the selected task model uses a configured provider.

Never log or expose full API keys. The browser should only receive masked key status.

---

## Content Radar

The Content Radar is a server-side rule engine that scans live engine state, existing drafts, and AI notes to surface publishable topic suggestions. It runs on every page load — no separate cron is needed.

### Topic sources
| Category | Trigger |
|---|---|
| Record | `longestSteps` or `highestPeak` updated, no matching draft exists |
| Progress | No weekly_report draft exists, engine has significant coverage |
| Near-Escape | `ai_notes` row with `note_type = near_escape` and `status = new` |
| Infrastructure | No integrity/trust draft exists, engine is running |
| Education | No educational draft exists |
| Visual | No visual-studio feature draft exists |

Topics are computed without AI calls — all logic is rule-based from real data. Topics disappear once a matching draft is created.

### Topic detection does not:
- Invent engine events
- Fabricate numbers
- Claim the conjecture is solved
- Create topics when data is insufficient (empty states shown instead)

### Creating a draft from a topic
1. Click a topic card in Content Radar
2. Select an output format (Blog Post, LinkedIn Post, etc.)
3. Click "Create Draft from this topic"
4. Draft is created pre-seeded with the required disclosure text
5. Status is set to `draft` by default regardless of mode

---

## Publishing Modes

The publishing mode is stored in `ai_observatory_settings.publishing_mode` and can be changed from the Settings tab.

### Manual
AI can create drafts only. Human must approve and export everything explicitly. Default for new installs.

### Semi-Auto (default)
AI automatically detects topics and creates drafts. Human must review and approve before any content appears publicly.

### Autonomous
AI detects topics, creates drafts, runs guardrail checks, and publishes to the public Observatory if all hard guardrails pass. Human reviews periodically. External platform publishing (Ghost, LinkedIn, X) remains manual export.

### Emergency Hold
Publishing is fully paused. AI may still create internal drafts and notes. Nothing can become public until the mode is changed.

To disable autonomous publishing immediately:
1. Go to Settings tab in AI Observatory
2. Set mode to `Emergency Hold` or `Manual`
3. Save settings

---

## Required Disclosure Text

Every autonomously generated report or post must include this exact text:

> This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.

For short social formats (character-limited platforms only):

> Generated automatically from verified Collatz Engine data. No proof claim is made.

The disclosure text is stored in `ai_observatory_settings.disclosure_text` and is pre-filled in every draft created from Content Radar topics. Do not remove it during editing without adding an equivalent disclaimer.

---

## Guardrail Publishing Rules

The following conditions block publishing regardless of mode:

| Condition | Blocks |
|---|---|
| Proof claim detected (`no_solution_claims`) | Approval + publish |
| Unsupported mathematical claim (`no_unsupported_claims`) | Approval + publish |
| Source data missing (`source_data_attached`) | Approval |
| Required image missing for profile (`requires_image`) | Approval |
| Disclosure text missing (`disclaimers_required`) | Warning (soft) |
| Draft not approved (`approval_before_publish`) | Publish |

In autonomous mode, all hard guardrail failures prevent publishing and the draft remains in `needs_review` status for human review.

---

## Public Observatory Behavior

The public `/observatory` page shows only:
- Drafts with `status = approved` or `status = published`
- Content that passed all hard guardrails before approval
- The required disclosure text (displayed per article)

The public page does **not** show:
- Drafts
- Rejected or archived content
- Internal AI notes
- Source data JSON
- API keys, masked or otherwise

---

## Image Generation

Images are generated via OpenAI DALL-E 3. The image prompt follows the Collatz Engine visual style:
- Dark scientific observatory aesthetic
- Teal/cyan trajectory graphs on dark backgrounds
- Mission-control mathematical telemetry
- No "conjecture solved" imagery
- No fake theorem announcements

If no image provider is configured, a polished placeholder is shown instead. The placeholder does not pretend to be a generated image.

DALL-E size mapping (API only accepts three sizes):
- Landscape → 1792×1024
- Portrait → 1024×1792
- Square → 1024×1024
