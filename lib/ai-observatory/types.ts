// ─── Providers ────────────────────────────────────────────────────────────────

export type ProviderName = "openai" | "anthropic" | "openrouter" | "gemini";

export interface AIProvider {
  id: string;
  provider_name: ProviderName;
  display_name: string;
  enabled: boolean;
  api_key_masked: string | null;
  last_tested_at: string | null;
  last_test_status: "ok" | "error" | "untested";
  last_test_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderCapabilities {
  text: boolean;
  images: boolean;
  embeddings: boolean;
}

export const PROVIDER_CAPABILITIES: Record<ProviderName, ProviderCapabilities> = {
  openai:      { text: true,  images: true,  embeddings: true  },
  anthropic:   { text: true,  images: false, embeddings: false },
  openrouter:  { text: true,  images: false, embeddings: false },
  gemini:      { text: true,  images: true,  embeddings: false },
};

// ─── Model Settings ───────────────────────────────────────────────────────────

export type TaskType =
  | "notes"
  | "drafts"
  | "reports"
  | "social"
  | "images"
  | "summaries"
  | "headlines";

export interface AIModelSetting {
  id: string;
  task_type: TaskType;
  provider_name: ProviderName;
  model_name: string;
  enabled: boolean;
  temperature: number;
  max_tokens: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_MODELS: Record<TaskType, { provider: ProviderName; model: string; temperature: number; max_tokens: number }> = {
  notes:     { provider: "anthropic", model: "claude-opus-4-8",        temperature: 0.3, max_tokens: 1000  },
  drafts:    { provider: "anthropic", model: "claude-opus-4-8",        temperature: 0.5, max_tokens: 4000  },
  reports:   { provider: "anthropic", model: "claude-opus-4-8",        temperature: 0.3, max_tokens: 6000  },
  social:    { provider: "anthropic", model: "claude-sonnet-4-6",      temperature: 0.6, max_tokens: 1000  },
  images:    { provider: "openai",    model: "dall-e-3",                temperature: 0.0, max_tokens: 0     },
  summaries: { provider: "anthropic", model: "claude-haiku-4-5-20251001", temperature: 0.3, max_tokens: 500  },
  headlines: { provider: "anthropic", model: "claude-haiku-4-5-20251001", temperature: 0.5, max_tokens: 200  },
};

// ─── Brand Voice ──────────────────────────────────────────────────────────────

export interface AIBrandVoiceProfile {
  id: string;
  name: string;
  is_default: boolean;
  voice_summary: string;
  long_form_instructions: string;
  social_instructions: string;
  image_style_instructions: string;
  preferred_phrases: string[];
  phrases_to_avoid: string[];
  formatting_rules: string;
  good_examples: string;
  bad_examples: string;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_BRAND_VOICE: Omit<AIBrandVoiceProfile, "id" | "created_at" | "updated_at"> = {
  name: "Collatz Engine Voice",
  is_default: true,
  voice_summary:
    "Serious, research-grade, plain English. Transparent about uncertainty. No proof claims, no hype. Sound like a credible public scientific infrastructure project.",
  long_form_instructions:
    "Write clearly and directly. Use plain English. Explain computations as observations, not proofs. Always note that results are computational, not mathematical proofs. Include disclaimers naturally. Do not sensationalize. Do not claim the Collatz Conjecture is solved or nearly solved. Be specific with numbers — cite actual verified counts, trajectory lengths, and peak values from the engine. Write as if a careful researcher is summarizing real observations for a technically literate audience.",
  social_instructions:
    "Keep it brief and factual. Lead with the specific number or discovery. Do not hype. Do not claim proof. Note it's a computation result. Sound like a scientist sharing interesting data, not a marketer. End with a pointer to the full report if relevant.",
  image_style_instructions:
    "Dark scientific observatory aesthetic. Mission-control interface feel. Collatz trajectory visuals — curved spirals, number sequences, trajectory graphs. Teal/cyan/blue on dark backgrounds. Mathematical telemetry. No 'conjecture solved' imagery. No fake theorem announcements. No generic stock-photo style. No cheap robot imagery.",
  preferred_phrases: [
    "verified by computation",
    "all trajectories reached 1",
    "computational observation",
    "consistent with the conjecture",
    "this is not a proof",
    "extending the verified catalog",
  ],
  phrases_to_avoid: [
    "proves the conjecture",
    "solves the Collatz problem",
    "discovered the pattern",
    "breakthrough",
    "definitive proof",
    "conjecture solved",
  ],
  formatting_rules:
    "Use numbered lists for step-by-step content. Use headings for long-form reports. Keep paragraphs short (3–4 sentences). Bold important numbers. Italicize caveats. Always include a disclaimer section for public posts.",
  good_examples:
    "The engine verified 1.24 million consecutive integers this week, extending the catalog to n = 3,866,700. All trajectories reached 1. This is consistent with the Collatz Conjecture, though consistency is not a proof.",
  bad_examples:
    "We PROVED the Collatz Conjecture! Every number converges! This is a MASSIVE mathematical discovery!",
};

// ─── Prompt Templates ─────────────────────────────────────────────────────────

export type TemplateType =
  | "ai_note"
  | "blog_post"
  | "linkedin_post"
  | "linkedin_article"
  | "x_post"
  | "x_thread"
  | "substack_post"
  | "weekly_report"
  | "observatory_report"
  | "image_prompt"
  | "headline"
  | "summary";

export interface AIPromptTemplate {
  id: string;
  template_type: TemplateType;
  name: string;
  description: string;
  template_body: string;
  required_variables: string[];
  enabled: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// ─── Image Presets ────────────────────────────────────────────────────────────

export type ImageTarget =
  | "blog"
  | "ghost"
  | "substack"
  | "linkedin_post"
  | "linkedin_article"
  | "x_post"
  | "x_thread"
  | "observatory_report"
  | "website"
  | "custom";

export interface AIImagePreset {
  id: string;
  name: string;
  target: ImageTarget;
  width: number;
  height: number;
  aspect_ratio: string;
  provider_name: ProviderName;
  model_name: string;
  style_prompt: string;
  allow_text_overlay: boolean;
  required: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Publishing Profiles ──────────────────────────────────────────────────────

export type PublishingTarget = "website" | "ghost" | "substack" | "linkedin" | "x" | "export_files";
export type ContentType =
  | "blog_post"
  | "linkedin_post"
  | "linkedin_article"
  | "x_post"
  | "x_thread"
  | "weekly_report"
  | "observatory_report";
export type OutputFormat = "markdown" | "html" | "plain_text" | "thread" | "json";

export interface AIPublishingProfile {
  id: string;
  name: string;
  target: PublishingTarget;
  content_type: ContentType;
  default_prompt_template_id: string | null;
  default_image_preset_id: string | null;
  requires_image: boolean;
  requires_human_approval: boolean;
  output_format: OutputFormat;
  min_words: number;
  max_words: number;
  cta_style: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ─── AI Notes ─────────────────────────────────────────────────────────────────

export type NoteType = "record" | "near_escape" | "milestone" | "range_summary" | "anomaly" | "pattern" | "system";
export type NoteSeverity = "info" | "interesting" | "important" | "critical";
export type NoteStatus = "new" | "reviewed" | "converted_to_draft" | "archived";

export interface AINoteRow {
  id: string;
  title: string;
  note_type: NoteType;
  body: string;
  source_event_type: string | null;
  source_data: Record<string, unknown> | null;
  severity: NoteSeverity;
  status: NoteStatus;
  created_at: string;
  updated_at: string;
}

// ─── AI Drafts ────────────────────────────────────────────────────────────────

export type DraftStatus = "draft" | "needs_review" | "approved" | "published" | "rejected" | "archived";

export interface AIDraftRow {
  id: string;
  title: string;
  content_type: ContentType;
  excerpt: string | null;
  tags: string[] | null;
  body_markdown: string | null;
  body_plain_text: string | null;
  body_html: string | null;
  image_prompt: string | null;
  image_url: string | null;
  image_preset_id: string | null;
  publishing_profile_id: string | null;
  source_note_id: string | null;
  source_data: Record<string, unknown> | null;
  status: DraftStatus;
  guardrail_status: string | null;
  review_notes: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIDraftAuditEvent {
  id: string;
  draft_id: string;
  event_type: string;
  event_label: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Generated Images ─────────────────────────────────────────────────────────

export type ImageStatus = "requested" | "generated" | "failed" | "approved" | "rejected";

export interface AIGeneratedImage {
  id: string;
  draft_id: string | null;
  provider_name: ProviderName;
  model_name: string;
  prompt: string;
  image_url: string | null;
  width: number;
  height: number;
  target: ImageTarget;
  status: ImageStatus;
  created_at: string;
  updated_at: string;
}

// ─── Observatory Settings ─────────────────────────────────────────────────────

export type PublishingMode = "manual" | "semi_auto" | "autonomous" | "emergency_hold";

export interface AIObservatorySettings {
  id: string;
  publishing_mode: PublishingMode;
  disclosure_text: string;
  auto_topic_detection_enabled: boolean;
  auto_draft_generation_enabled: boolean;
  auto_image_generation_enabled: boolean;
  auto_publish_enabled: boolean;
  max_auto_posts_per_day: number;
  weekly_report_enabled: boolean;
  record_trigger_enabled: boolean;
  near_escape_trigger_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_DISCLOSURE_TEXT =
  "This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.";

export const SHORT_DISCLOSURE_TEXT =
  "Generated automatically from verified Collatz Engine data. No proof claim is made.";

export const DEFAULT_OBSERVATORY_SETTINGS: Omit<AIObservatorySettings, "id" | "created_at" | "updated_at"> = {
  publishing_mode: "semi_auto",
  disclosure_text: DEFAULT_DISCLOSURE_TEXT,
  auto_topic_detection_enabled: true,
  auto_draft_generation_enabled: false,
  auto_image_generation_enabled: false,
  auto_publish_enabled: false,
  max_auto_posts_per_day: 1,
  weekly_report_enabled: true,
  record_trigger_enabled: true,
  near_escape_trigger_enabled: true,
};

// ─── Guardrails ───────────────────────────────────────────────────────────────

export type GuardrailEnforcement = "enforced" | "configured" | "manual" | "planned";

export interface GuardrailRule {
  id: string;
  label: string;
  description: string;
  enforcement: GuardrailEnforcement;
  passed?: boolean;
  detail?: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface AIObservatoryStats {
  notesCount: number;
  draftsCount: number;
  needsReviewCount: number;
  approvedCount: number;
  publishedCount: number;
  rejectedCount: number;
  reportsGenerated: number;
  imagesGenerated: number;
}

// ─── Provider Generation ──────────────────────────────────────────────────────

export interface GenerateTextInput {
  taskType: TaskType;
  prompt: string;
  systemPrompt?: string;
  sourceData?: Record<string, unknown>;
}

export interface GenerateTextResult {
  ok: boolean;
  text?: string;
  error?: string;
  provider?: ProviderName;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerateImageInput {
  prompt: string;
  width: number;
  height: number;
  target: ImageTarget;
  draftId?: string;
}

export interface GenerateImageResult {
  ok: boolean;
  imageUrl?: string;
  error?: string;
  provider?: ProviderName;
  model?: string;
}
