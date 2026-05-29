import type { AIImagePreset, AIPublishingProfile, AIPromptTemplate } from "./types";

// ─── Image Presets (seeds) ────────────────────────────────────────────────────

export const DEFAULT_IMAGE_PRESETS: Omit<AIImagePreset, "id" | "created_at" | "updated_at">[] = [
  {
    name: "Blog / Ghost Hero",
    target: "ghost",
    width: 1200,
    height: 630,
    aspect_ratio: "1.91:1",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Dark scientific observatory dashboard, mathematical trajectory visualization, teal and cyan glowing lines on deep dark background, mission-control aesthetic, Collatz sequence spiral patterns, elegant and minimal",
    allow_text_overlay: true,
    required: true,
  },
  {
    name: "Substack Cover",
    target: "substack",
    width: 1456,
    height: 1048,
    aspect_ratio: "1.39:1",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Mathematical observatory at night, abstract number sequences flowing like light trails, dark blue and teal gradient, scientific research aesthetic, no text, no labels",
    allow_text_overlay: true,
    required: true,
  },
  {
    name: "LinkedIn Post Image",
    target: "linkedin_post",
    width: 1200,
    height: 627,
    aspect_ratio: "1.91:1",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Professional dark theme data visualization, abstract mathematical graph, teal accent lines, clean minimal scientific aesthetic, suitable for professional network post",
    allow_text_overlay: true,
    required: false,
  },
  {
    name: "LinkedIn Article Cover",
    target: "linkedin_article",
    width: 1200,
    height: 627,
    aspect_ratio: "1.91:1",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Mathematical research article cover, dark observatory aesthetic, trajectory plots on dark background, teal/cyan glow, sophisticated and minimal",
    allow_text_overlay: true,
    required: true,
  },
  {
    name: "X / Twitter Post Image",
    target: "x_post",
    width: 1600,
    height: 900,
    aspect_ratio: "16:9",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Dark minimalist data visualization, Collatz mathematical pattern, abstract spiral or trajectory graph, teal on black, clean social media card aesthetic",
    allow_text_overlay: true,
    required: false,
  },
  {
    name: "X Thread Image",
    target: "x_thread",
    width: 1600,
    height: 900,
    aspect_ratio: "16:9",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Mathematical computation visualization, dark background with teal data streams, abstract sequence diagram, no text overlay, clean and dramatic",
    allow_text_overlay: false,
    required: false,
  },
  {
    name: "Observatory Report Hero",
    target: "observatory_report",
    width: 1600,
    height: 900,
    aspect_ratio: "16:9",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Grand scientific observatory building at night, mathematical equations floating as light particles, dramatic dark atmosphere, teal and indigo luminescence, cinematic quality",
    allow_text_overlay: true,
    required: true,
  },
  {
    name: "Website Card",
    target: "website",
    width: 1200,
    height: 630,
    aspect_ratio: "1.91:1",
    provider_name: "openai",
    model_name: "dall-e-3",
    style_prompt:
      "Abstract Collatz sequence visualization, dark web card image, teal glowing mathematical paths, minimal and modern scientific aesthetic",
    allow_text_overlay: true,
    required: false,
  },
];

// ─── Publishing Profiles (seeds) ─────────────────────────────────────────────

export const DEFAULT_PUBLISHING_PROFILES: Omit<AIPublishingProfile, "id" | "created_at" | "updated_at">[] = [
  {
    name: "Ghost Blog Post",
    target: "ghost",
    content_type: "blog_post",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: true,
    requires_human_approval: true,
    output_format: "markdown",
    min_words: 400,
    max_words: 1200,
    cta_style: "View the full engine dashboard",
    enabled: true,
  },
  {
    name: "Substack Post",
    target: "substack",
    content_type: "blog_post",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: true,
    requires_human_approval: true,
    output_format: "markdown",
    min_words: 300,
    max_words: 1000,
    cta_style: "Subscribe for weekly engine updates",
    enabled: true,
  },
  {
    name: "LinkedIn Post",
    target: "linkedin",
    content_type: "linkedin_post",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: false,
    requires_human_approval: true,
    output_format: "plain_text",
    min_words: 80,
    max_words: 300,
    cta_style: "Link to full report",
    enabled: true,
  },
  {
    name: "LinkedIn Article",
    target: "linkedin",
    content_type: "linkedin_article",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: true,
    requires_human_approval: true,
    output_format: "markdown",
    min_words: 600,
    max_words: 2000,
    cta_style: "Explore the Collatz Engine",
    enabled: true,
  },
  {
    name: "X Post",
    target: "x",
    content_type: "x_post",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: false,
    requires_human_approval: true,
    output_format: "plain_text",
    min_words: 20,
    max_words: 60,
    cta_style: "Link to report",
    enabled: true,
  },
  {
    name: "X Thread",
    target: "x",
    content_type: "x_thread",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: true,
    requires_human_approval: true,
    output_format: "thread",
    min_words: 100,
    max_words: 400,
    cta_style: "Follow for updates",
    enabled: true,
  },
  {
    name: "Weekly Observatory Report",
    target: "website",
    content_type: "weekly_report",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: true,
    requires_human_approval: true,
    output_format: "markdown",
    min_words: 500,
    max_words: 1500,
    cta_style: "View full engine dashboard",
    enabled: true,
  },
  {
    name: "Export Markdown",
    target: "export_files",
    content_type: "blog_post",
    default_prompt_template_id: null,
    default_image_preset_id: null,
    requires_image: false,
    requires_human_approval: true,
    output_format: "markdown",
    min_words: 0,
    max_words: 99999,
    cta_style: "",
    enabled: true,
  },
];

// ─── Prompt Templates (seeds) ─────────────────────────────────────────────────

export const DEFAULT_PROMPT_TEMPLATES: Omit<AIPromptTemplate, "id" | "created_at" | "updated_at">[] = [
  {
    template_type: "ai_note",
    name: "AI Note from Engine Event",
    description: "Generates a concise AI note from a verified engine event or record.",
    template_body: `You are summarizing a verified computational observation from The Collatz Engine.

Engine event data:
{source_data}

Brand voice:
{brand_voice}

Guardrails:
- Do not claim this proves the Collatz Conjecture.
- Describe results as computational observations only.
- Be specific with numbers. Use the actual values from source_data.
- Keep it under 150 words.
- Include: what happened, the key numbers, and why it is interesting computationally.
- Never claim a "mathematical discovery" or "breakthrough."

Write a concise AI note (title + 2-3 sentence body):`,
    required_variables: ["source_data", "brand_voice"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "blog_post",
    name: "Blog Post from Engine Data",
    description: "Generates a blog post from engine records and range summaries.",
    template_body: `You are writing a blog post for The Collatz Engine public site.

Source data:
{source_data}

Brand voice:
{brand_voice}

Publishing profile:
{publishing_profile}

Guardrails:
- Do not claim the Collatz Conjecture is proved.
- All statistics must come from the source_data provided.
- Include a disclaimer: "These are computational observations, not mathematical proofs."
- Write clearly and engagingly for a technically literate general audience.
- Use the target word count from the publishing profile.
- Include: title, excerpt, body paragraphs, disclaimer section.

Write the full blog post in Markdown:`,
    required_variables: ["source_data", "brand_voice", "publishing_profile"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "linkedin_post",
    name: "LinkedIn Post",
    description: "Short LinkedIn post from a draft or engine event.",
    template_body: `Write a LinkedIn post about this Collatz Engine update.

Source data / draft summary:
{source_data}

Brand voice:
{brand_voice}

Rules:
- Max 300 words.
- No markdown. Plain text only.
- Lead with the interesting data point.
- End with a clear CTA.
- Never claim proof or "solved."
- Include: the number/result, why it matters computationally, CTA.

Write the LinkedIn post:`,
    required_variables: ["source_data", "brand_voice"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "x_post",
    name: "X / Twitter Post",
    description: "Single X post (max 280 chars) from engine data.",
    template_body: `Write a single X (Twitter) post about this Collatz Engine update.

Source data:
{source_data}

Rules:
- Maximum 280 characters including the CTA.
- Plain text. No markdown.
- Lead with the number/fact.
- Do not claim proof.
- End with a link placeholder [LINK].

Write the X post:`,
    required_variables: ["source_data"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "x_thread",
    name: "X Thread",
    description: "Multi-post X thread (4–6 posts) about an engine event or report.",
    template_body: `Write an X (Twitter) thread about this Collatz Engine update.

Source data:
{source_data}

Brand voice:
{brand_voice}

Rules:
- 4 to 6 posts, each clearly numbered: 1/, 2/, 3/ etc.
- Each post max 280 characters.
- First post is the hook — lead with the most interesting fact.
- Last post has the CTA and [LINK].
- Plain text. No markdown inside posts.
- Never claim proof.
- Make it educational and interesting.

Write the X thread:`,
    required_variables: ["source_data", "brand_voice"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "weekly_report",
    name: "Weekly Observatory Report",
    description: "Full weekly digest report from engine activity data.",
    template_body: `You are writing the Weekly Observatory Report for The Collatz Engine.

Engine state and weekly stats:
{source_data}

Brand voice:
{brand_voice}

Guardrails:
- All numbers must come from the source_data.
- Include a disclaimer about computational vs. mathematical proof.
- Do not claim the conjecture is proved.
- Structure: Title, Date range, Summary, Numbers processed, Records, Notable observations, Disclaimer.

Write the full weekly report in Markdown:`,
    required_variables: ["source_data", "brand_voice"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "image_prompt",
    name: "Image Generation Prompt",
    description: "Generates a DALL-E image prompt for a draft or report.",
    template_body: `Create an image generation prompt for this Collatz Engine content.

Content title: {title}
Content type: {content_type}
Image preset: {image_preset}
Brand voice image style: {image_style}

Rules:
- Describe a dark scientific observatory aesthetic.
- Include Collatz trajectory visuals — spiraling paths, number sequences, mathematical flow.
- Use teal, cyan, and blue color palette on dark background.
- Do NOT include text in the image.
- Do NOT imply the conjecture is proved.
- Make it visually dramatic and mathematically evocative.
- Keep the prompt under 200 words.

Write the image generation prompt:`,
    required_variables: ["title", "content_type", "image_preset", "image_style"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "headline",
    name: "Headline Generator",
    description: "Generates 5 headline options for a report or post.",
    template_body: `Generate 5 headline options for this Collatz Engine content.

Content summary: {source_data}
Content type: {content_type}

Rules:
- Each headline must be factual and specific.
- Use actual numbers from the source.
- Do not claim proof.
- No clickbait or sensationalism.
- Keep each under 80 characters.
- Vary the style: some informational, some interesting-fact style.

List 5 headline options (numbered):`,
    required_variables: ["source_data", "content_type"],
    enabled: true,
    version: 1,
  },
  {
    template_type: "summary",
    name: "Short Summary",
    description: "Generates a 2-3 sentence summary/excerpt from a longer draft.",
    template_body: `Summarize the following Collatz Engine content in 2-3 sentences.

Content:
{source_data}

Rules:
- Be specific — include key numbers.
- Do not claim proof.
- Keep it factual and clear.
- Suitable for use as an article excerpt or meta description.

Write the summary:`,
    required_variables: ["source_data"],
    enabled: true,
    version: 1,
  },
];
