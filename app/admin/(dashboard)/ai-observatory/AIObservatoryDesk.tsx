"use client";

import { useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  FileJson,
  FileText,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { checkDraftGuardrails } from "@/lib/ai-observatory/guardrails";
import type {
  AIBrandVoiceProfile,
  AIDraftRow,
  AIImagePreset,
  AIModelSetting,
  AINoteRow,
  AIPromptTemplate,
  AIPublishingProfile,
  AIProvider,
  AIObservatoryStats,
  ContentType,
  DraftStatus,
  ProviderCapabilities,
  ProviderName,
} from "@/lib/ai-observatory/types";
import { DEFAULT_BRAND_VOICE } from "@/lib/ai-observatory/types";
import { AIStudioClient } from "./AIStudioClient";
import {
  approveDraftAction,
  archiveDraftAction,
  createBlankDraftAction,
  generateImageAction,
  improveDraftAction,
  markPublishedAction,
  rejectDraftAction,
  reopenDraftAction,
  runGuardrailsAction,
  saveDraftAction,
  updateNoteStatusAction,
} from "./actions";

type MainTab = "overview" | "queue" | "editor" | "notes" | "reports" | "published" | "studio" | "usage";
type QueueFilter = "all" | DraftStatus | "published_exported";
type SortMode = "updated" | "created" | "status" | "content_type";

interface Props {
  stats: AIObservatoryStats;
  drafts: AIDraftRow[];
  notes: AINoteRow[];
  providers: AIProvider[];
  modelSettings: AIModelSetting[];
  brandVoices: AIBrandVoiceProfile[];
  templates: AIPromptTemplate[];
  imagePresets: AIImagePreset[];
  publishingProfiles: AIPublishingProfile[];
  encryptionReady: boolean;
  tablesReady: boolean;
  engineStatus: string;
  workerLockStatus: string;
  providerCapabilities: Record<ProviderName, ProviderCapabilities>;
}

const mainTabs: { id: MainTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "queue", label: "Draft Queue" },
  { id: "editor", label: "Draft Editor" },
  { id: "notes", label: "AI Notes" },
  { id: "reports", label: "Reports" },
  { id: "published", label: "Published / Exported" },
  { id: "studio", label: "AI Studio" },
  { id: "usage", label: "Usage" },
];

const contentTypes: ContentType[] = [
  "blog_post",
  "linkedin_post",
  "linkedin_article",
  "x_post",
  "x_thread",
  "weekly_report",
  "observatory_report",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function shortId(id: string | null | undefined) {
  if (!id) return "no id";
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function age(iso: string | null | undefined) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-slate-800/90 bg-slate-900/70 shadow-2xl shadow-slate-950/20 backdrop-blur", className)}>
      {children}
    </section>
  );
}

function PanelTitle({ title, help, action }: { title: string; help?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">{title}</p>
        {help}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "border-slate-600 bg-slate-700/30 text-slate-300",
    needs_review: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    approved: "border-green-500/40 bg-green-500/15 text-green-300",
    published: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    rejected: "border-red-500/40 bg-red-500/15 text-red-300",
    archived: "border-slate-700 bg-slate-950 text-slate-500",
  };
  return <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase", styles[status] ?? styles.draft)}>{titleCase(status)}</span>;
}

function Pill({ label, value, tone = "slate" }: { label: string; value: string; tone?: "green" | "teal" | "amber" | "red" | "purple" | "slate" }) {
  const tones = {
    green: "border-green-500/25 text-green-300",
    teal: "border-teal-500/25 text-teal-300",
    amber: "border-amber-500/25 text-amber-300",
    red: "border-red-500/25 text-red-300",
    purple: "border-purple-500/25 text-purple-300",
    slate: "border-slate-700 text-slate-300",
  };
  return (
    <div className={cx("inline-flex items-center gap-2 rounded-lg border bg-slate-950/60 px-3 py-1.5 text-[10px]", tones[tone])}>
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="font-bold">{value}</span>
      {(tone === "green" || tone === "teal") && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
    </div>
  );
}

function imageStatus(draft: AIDraftRow, profile?: AIPublishingProfile, preset?: AIImagePreset) {
  if (!profile?.requires_image && !preset?.required) return "Image Not Required";
  if (draft.image_url) return "Image Ready";
  if (draft.image_prompt) return "Image Placeholder";
  return profile?.requires_image || preset?.required ? "Image Missing" : "Image Required";
}

function sourceType(draft: AIDraftRow) {
  const raw = String(draft.source_data?.source_type ?? draft.source_data?.type ?? draft.source_data?.event_type ?? "");
  if (draft.source_note_id) return "AI Note";
  if (!draft.source_data) return "Manual Draft";
  if (raw.includes("near")) return "Near-Escape Candidate";
  if (raw.includes("weekly")) return "Weekly Report";
  if (raw.includes("record")) return "Record Event";
  return raw ? titleCase(raw) : "System Summary";
}

function markdownToText(markdown: string) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`[\]()]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function markdownToHtml(markdown: string) {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      if (block.startsWith("### ")) return `<h3>${block.slice(4)}</h3>`;
      if (block.startsWith("## ")) return `<h2>${block.slice(3)}</h2>`;
      if (block.startsWith("# ")) return `<h1>${block.slice(2)}</h1>`;
      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AIObservatoryDesk({
  stats,
  drafts,
  notes,
  providers,
  modelSettings,
  brandVoices,
  templates,
  imagePresets,
  publishingProfiles,
  encryptionReady,
  tablesReady,
  engineStatus,
  workerLockStatus,
  providerCapabilities,
}: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [selectedDraftId, setSelectedDraftId] = useState(drafts[0]?.id ?? "");
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [sort, setSort] = useState<SortMode>("updated");
  const [search, setSearch] = useState("");
  const [editorView, setEditorView] = useState<"markdown" | "preview" | "plain" | "html" | "social">("markdown");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const textProvider = providers.find((p) => p.enabled && p.api_key_masked && providerCapabilities[p.provider_name]?.text);
  const imageProvider = providers.find((p) => p.provider_name === "openai" && p.enabled && p.api_key_masked);
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null;

  const profileFor = (draft: AIDraftRow | null | undefined) =>
    publishingProfiles.find((profile) => profile.id === draft?.publishing_profile_id)
    ?? publishingProfiles.find((profile) => profile.content_type === draft?.content_type)
    ?? null;

  const presetFor = (draft: AIDraftRow | null | undefined) => {
    const profile = profileFor(draft);
    return imagePresets.find((preset) => preset.id === draft?.image_preset_id)
      ?? imagePresets.find((preset) => preset.id === profile?.default_image_preset_id)
      ?? imagePresets.find((preset) => preset.target === profile?.content_type || preset.target === profile?.target)
      ?? null;
  };

  const q = search.trim().toLowerCase();
  const filteredDrafts = drafts
    .filter((draft) => {
      if (filter === "published_exported" && draft.status !== "published") return false;
      if (filter !== "all" && filter !== "published_exported" && draft.status !== filter) return false;
      const profile = profileFor(draft);
      const haystack = [draft.title, draft.content_type, draft.status, profile?.name, profile?.target].join(" ").toLowerCase();
      return !q || haystack.includes(q);
    })
    .sort((a, b) => {
      if (sort === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "content_type") return a.content_type.localeCompare(b.content_type);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const selectedProfile = profileFor(selectedDraft);
  const selectedPreset = presetFor(selectedDraft);
  const selectedGuardrails = selectedDraft ? checkDraftGuardrails(selectedDraft) : null;
  const selectedMarkdown = selectedDraft?.body_markdown ?? "";
  const selectedPlain = selectedDraft?.body_plain_text ?? markdownToText(selectedMarkdown);
  const selectedHtml = selectedDraft?.body_html ?? markdownToHtml(selectedMarkdown);
  const selectedTags = selectedDraft?.tags?.join(", ") ?? "";
  const words = selectedPlain.split(/\s+/).filter(Boolean).length;
  const chars = selectedPlain.length;

  const setupItems = [
    { label: "Run Supabase migration", state: tablesReady ? "Done" : "Missing", detail: "Run supabase/phase-3a-ai-observatory.sql in the Supabase SQL Editor.", command: "supabase/phase-3a-ai-observatory.sql" },
    { label: "Set AI_SETTINGS_ENCRYPTION_KEY", state: encryptionReady ? "Done" : "Missing", detail: "Generate a 64-character hex key and set it in .env.local and Vercel.", command: "openssl rand -hex 32" },
    { label: "Redeploy", state: encryptionReady ? "Done" : "Missing", detail: "Redeploy after adding or rotating the encryption variable.", command: "" },
    { label: "Add OpenAI key", state: imageProvider ? "Done" : "Missing", detail: "Required for real image generation. Keys are saved in AI Studio -> Providers.", command: "" },
    { label: "Add Anthropic/Claude key", state: textProvider ? "Done" : "Optional", detail: "Recommended for text generation. OpenAI text can also be used if configured.", command: "" },
    { label: "Test providers", state: providers.some((p) => p.last_test_status === "ok") ? "Done" : "Optional", detail: "Use the Test Connection buttons in AI Studio -> Providers.", command: "" },
    { label: "Generate first draft", state: drafts.length > 0 ? "Done" : "Missing", detail: "Create a draft manually, convert an AI note, or generate a weekly report foundation.", command: "" },
  ];

  function runDraftAction(action: (fd: FormData) => Promise<{ ok: boolean; error?: string; id?: string; summary?: string }>, extra?: Record<string, string>) {
    if (!selectedDraft) return;
    const fd = new FormData();
    fd.append("id", selectedDraft.id);
    Object.entries(extra ?? {}).forEach(([key, value]) => fd.append(key, value));
    startTransition(async () => {
      const result = await action(fd);
      setMessage(result.ok ? result.summary ?? "Action completed." : result.error ?? "Action failed.");
    });
  }

  function createDraft(contentType: ContentType = "blog_post") {
    const fd = new FormData();
    fd.append("content_type", contentType);
    fd.append("title", `Untitled ${titleCase(contentType)}`);
    const profile = publishingProfiles.find((p) => p.content_type === contentType);
    if (profile) fd.append("publishing_profile_id", profile.id);
    startTransition(async () => {
      const result = await createBlankDraftAction(fd);
      if (result.ok && result.id) {
        setSelectedDraftId(result.id);
        setActiveTab("editor");
        setMessage("Draft created. Refresh if it does not appear immediately.");
      } else {
        setMessage(result.error ?? "Unable to create draft.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1880px] space-y-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">AI Observatory</h1>
            <PanelHelp
              title="AI Observatory"
              description="Editorial production desk for AI-assisted notes, drafts, images, and reports from verified Collatz Engine data."
              operatorNote="Nothing auto-publishes. Drafts require human review and approval."
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">AI-assisted insights, drafts, and reports from verified Collatz Engine data</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Pill label="Engine" value={titleCase(engineStatus)} tone={engineStatus === "running" ? "green" : "slate"} />
          <Pill label="Worker Lock" value={titleCase(workerLockStatus)} tone={workerLockStatus === "active" ? "green" : "slate"} />
          <Pill label="Text" value={textProvider?.display_name ?? "Not configured"} tone={textProvider ? "teal" : "amber"} />
          <Pill label="Images" value={imageProvider ? "OpenAI configured" : "Not configured"} tone={imageProvider ? "purple" : "amber"} />
          <Pill label="Guardrails" value="Manual approval" tone="green" />
          <button onClick={() => setActiveTab("studio")} className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-[11px] font-semibold text-purple-200 hover:bg-purple-500/20">
            AI Studio
          </button>
          <Link href="/observatory" className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-400 hover:border-teal-500/40 hover:text-teal-300">
            Public Observatory
          </Link>
        </div>
      </div>

      {(!tablesReady || !encryptionReady || !textProvider || !imageProvider || drafts.length === 0) && (
        <Panel className="border-amber-500/20 bg-amber-950/10">
          <PanelTitle
            title="Setup Checklist"
            help={<PanelHelp title="Setup Checklist" description="Shows what is needed before the editorial workflow can generate text, generate images, and produce the first reviewed draft." />}
            action={<button onClick={() => setActiveTab("studio")} className="text-[10px] font-semibold text-teal-300 hover:underline">Open AI Studio → Providers</button>}
          />
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {setupItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-slate-200">{item.label}</p>
                  <span className={cx(
                    "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
                    item.state === "Done" && "border-green-500/30 bg-green-500/10 text-green-300",
                    item.state === "Missing" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                    item.state === "Optional" && "border-slate-600 bg-slate-800 text-slate-400",
                  )}>{item.state}</span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">{item.detail}</p>
                {item.command && (
                  <button onClick={() => copyText(item.command)} className="mt-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[10px] text-cyan-300 hover:border-cyan-500/40">
                    {item.command}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/70 p-1">
        {mainTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              "shrink-0 rounded-md px-3 py-2 text-[11px] font-semibold transition",
              activeTab === tab.id ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/40" : "text-slate-500 hover:bg-slate-900 hover:text-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-4 py-2 text-[11px] text-cyan-200">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-cyan-400 hover:text-cyan-100">Dismiss</button>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {[
              ["AI Notes", stats.notesCount, "text-teal-300"],
              ["Drafts", stats.draftsCount, "text-cyan-300"],
              ["Needs Review", stats.needsReviewCount, "text-amber-300"],
              ["Approved", stats.approvedCount, "text-green-300"],
              ["Published / Exported", stats.publishedCount, "text-blue-300"],
              ["Images Generated", stats.imagesGenerated, "text-purple-300"],
              ["Reports Generated", stats.reportsGenerated, "text-sky-300"],
              ["Archived / Rejected", stats.rejectedCount, "text-slate-400"],
            ].map(([label, value, color]) => (
              <Panel key={label as string} className="p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className={cx("mt-2 text-2xl font-black tabular-nums", color as string)}>{value}</p>
              </Panel>
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            {renderQueuePanel(true)}
            <Panel>
              <PanelTitle title="Publishing Targets" help={<PanelHelp title="Publishing Targets" description="Manual export destinations for approved or in-review drafts. No direct platform posting is enabled in this phase." />} />
              <div className="grid gap-3 p-4 sm:grid-cols-2">
                {[
                  ["Website", "Public Observatory. Shows approved or published drafts only."],
                  ["Ghost / AMAETE.com", "Manual markdown package with feature image URL or prompt."],
                  ["LinkedIn", "Manual plain-text post or article package."],
                  ["X / Twitter", "Manual short post or thread package with character counts."],
                  ["Export Files", "Download markdown, text, HTML, or JSON package."],
                  ["Substack", "Manual cover image and markdown package when profile exists."],
                ].map(([name, detail]) => (
                  <button key={name} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-teal-500/30">
                    <p className="text-[11px] font-bold text-slate-200">{name}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{detail}</p>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "queue" && renderQueuePanel(false)}
      {activeTab === "editor" && renderEditor()}
      {activeTab === "notes" && renderNotes()}
      {activeTab === "reports" && renderReports()}
      {activeTab === "published" && renderPublished()}
      {activeTab === "studio" && (
        <AIStudioClient
          providers={providers}
          modelSettings={modelSettings}
          brandVoices={brandVoices}
          templates={templates}
          imagePresets={imagePresets}
          publishingProfiles={publishingProfiles}
          encryptionReady={encryptionReady}
          defaultBrandVoice={DEFAULT_BRAND_VOICE}
          providerCapabilities={providerCapabilities}
        />
      )}
      {activeTab === "usage" && (
        <Panel>
          <PanelTitle title="Usage / Cost" help={<PanelHelp title="Usage" description="Usage events appear here after generation calls are logged. Empty states are shown instead of fake cost numbers." />} />
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-300">No usage events to display yet.</p>
            <p className="mt-2 text-[11px] text-slate-500">Generation is server-side and will only report real provider usage when available.</p>
          </div>
        </Panel>
      )}
    </div>
  );

  function renderQueuePanel(compact: boolean) {
    return (
      <Panel className={compact ? "" : "min-h-[680px]"}>
        <PanelTitle
          title="Draft Queue"
          help={<PanelHelp title="Draft Queue" description="Shows content created but not yet approved. Nothing here is public until it passes review and is approved." source="ai_drafts table." />}
          action={<button onClick={() => createDraft()} className="rounded-md border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-200">New Draft</button>}
        />
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["draft", "Draft"],
              ["needs_review", "Needs Review"],
              ["approved", "Approved"],
              ["published_exported", "Published / Exported"],
              ["rejected", "Rejected"],
              ["archived", "Archived"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id as QueueFilter)}
                className={cx("rounded-full border px-2.5 py-1 text-[10px] font-semibold", filter === id ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-slate-800 text-slate-500 hover:text-slate-200")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-slate-600" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, type, profile, status" className="w-full bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600" />
            </label>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 outline-none">
              <option value="updated">Newest updated</option>
              <option value="created">Newest created</option>
              <option value="status">Status</option>
              <option value="content_type">Content type</option>
            </select>
          </div>
          {filteredDrafts.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-400">No drafts yet.</p>
              <p className="mt-1 text-[11px] text-slate-600">Generate a draft from an AI note, create one manually, or generate a weekly report.</p>
            </div>
          ) : (
            <div className={cx("grid gap-2", compact && "xl:grid-cols-2")}>
              {filteredDrafts.map((draft) => {
                const profile = profileFor(draft);
                const preset = presetFor(draft);
                const guardrails = checkDraftGuardrails(draft);
                const isSelected = selectedDraftId === draft.id;
                return (
                  <button
                    key={draft.id}
                    onClick={() => {
                      setSelectedDraftId(draft.id);
                      setActiveTab("editor");
                    }}
                    className={cx(
                      "group rounded-lg border bg-slate-950/50 p-3 text-left transition",
                      isSelected ? "border-teal-400/70 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]" : "border-slate-800 hover:border-slate-700",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-black text-cyan-300">{draft.content_type.includes("x_") ? "X" : draft.content_type.includes("linkedin") ? "in" : "CE"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-bold text-slate-100">{draft.title}</p>
                          <StatusBadge status={draft.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>{titleCase(draft.content_type)}</span>
                          <span>{profile?.name ?? "No profile"}</span>
                          <span>{imageStatus(draft, profile ?? undefined, preset ?? undefined)}</span>
                          <span className={guardrails.passed ? "text-green-300" : "text-amber-300"}>{guardrails.passed ? "Guardrails pass" : "Guardrails warning"}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[9px] text-slate-600">
                          {draft.source_note_id && <span>Source note attached</span>}
                          <span>Updated {age(draft.updated_at)}</span>
                          <span>Created {fmtDate(draft.created_at)}</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-2 h-4 w-4 text-slate-600 group-hover:text-teal-300" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  function renderEditor() {
    if (!selectedDraft) {
      return (
        <Panel>
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-bold text-slate-200">Select a draft from the Draft Queue or create a new draft.</p>
            <p className="mt-2 max-w-md text-sm text-slate-500">The editor opens inside AI Observatory. No new admin sidebar item is needed.</p>
            <button onClick={() => setActiveTab("queue")} className="mt-5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200">Open Draft Queue</button>
          </div>
        </Panel>
      );
    }

    const profileRequiresImage = Boolean(selectedProfile?.requires_image || selectedPreset?.required);
    const canEdit = !["published", "archived"].includes(selectedDraft.status);
    const sourceJson = JSON.stringify(selectedDraft.source_data ?? {}, null, 2);

    return (
      <form action={async (fd) => {
        const result = await saveDraftAction(fd);
        setMessage(result.ok ? "Draft saved." : result.error ?? "Unable to save draft.");
      }} className="space-y-4">
        <input type="hidden" name="id" value={selectedDraft.id} />
        <div className="grid gap-4 2xl:grid-cols-[360px_minmax(520px,1fr)_340px_330px]">
          {renderQueuePanel(false)}
          <Panel className="min-h-[720px]">
            <PanelTitle
              title="Editing Draft"
              help={<PanelHelp title="Draft Editor" description="Edit title, body, excerpt, tags, review notes, publishing profile, content type, and image prompt. Verified source data remains read-only." />}
              action={<div className="flex items-center gap-2"><StatusBadge status={selectedDraft.status} /><span className="text-[10px] text-slate-600">ID {shortId(selectedDraft.id)}</span></div>}
            />
            <div className="space-y-3 p-4">
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Title</span>
                <input name="title" defaultValue={selectedDraft.title} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60" />
              </label>
              <div className="grid gap-3 lg:grid-cols-3">
                <label>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Publishing Profile</span>
                  <select name="publishing_profile_id" defaultValue={selectedDraft.publishing_profile_id ?? selectedProfile?.id ?? ""} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                    <option value="">No profile</option>
                    {publishingProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Content Type</span>
                  <select name="content_type" defaultValue={selectedDraft.content_type} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                    {contentTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Image Preset</span>
                  <select name="image_preset_id" defaultValue={selectedDraft.image_preset_id ?? selectedPreset?.id ?? ""} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                    <option value="">No preset</option>
                    {imagePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Excerpt</span>
                <textarea name="excerpt" defaultValue={selectedDraft.excerpt ?? ""} disabled={!canEdit} rows={2} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tags</span>
                <input name="tags" defaultValue={selectedTags} disabled={!canEdit} placeholder="collatz, computation, observatory" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
              </label>
              <input type="hidden" name="status" value={selectedDraft.status} />
              <input type="hidden" name="source_note_id" value={selectedDraft.source_note_id ?? ""} />
              <div className="flex flex-wrap gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
                {(["markdown", "preview", "plain", "html", "social"] as const).map((view) => (
                  <button key={view} type="button" onClick={() => setEditorView(view)} className={cx("rounded-md px-3 py-1.5 text-[10px] font-semibold", editorView === view ? "bg-teal-500/15 text-teal-200" : "text-slate-500 hover:text-slate-200")}>{titleCase(view)}</button>
                ))}
              </div>
              {editorView === "markdown" && (
                <div>
                  <div className="mb-1 flex flex-wrap gap-1">
                    {["H", "B", "I", "List", "Quote", "Link", "Undo", "Redo"].map((tool) => (
                      <button key={tool} type="button" className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-400">{tool}</button>
                    ))}
                  </div>
                  <textarea name="body_markdown" defaultValue={selectedMarkdown} disabled={!canEdit} rows={18} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
                </div>
              )}
              {editorView === "preview" && <div className="min-h-[420px] whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-sm leading-relaxed text-slate-300">{selectedMarkdown || "No markdown body yet."}</div>}
              {editorView === "plain" && <textarea name="body_plain_text" defaultValue={selectedPlain} disabled={!canEdit} rows={18} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-[12px] leading-relaxed text-slate-200 outline-none" />}
              {editorView === "html" && <textarea name="body_html" defaultValue={selectedHtml} disabled={!canEdit} rows={18} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-200 outline-none" />}
              {editorView === "social" && <div className="min-h-[420px] rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-300"><p className="font-semibold text-slate-200">{selectedDraft.title}</p><p className="mt-3 whitespace-pre-wrap">{selectedPlain.slice(0, 900) || "No social preview yet."}</p></div>}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
                <span>Words: {words}</span>
                <span>Chars: {chars}</span>
                <span>Reading time: {Math.max(1, Math.ceil(words / 220))} min</span>
                <span>Updated {fmtDate(selectedDraft.updated_at)}</span>
              </div>
              {!textProvider && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">Provider not configured. Add API key in AI Studio → Providers.</p>}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" disabled={!textProvider || isPending} onClick={() => runDraftAction(improveDraftAction, { provider_name: textProvider?.provider_name ?? "anthropic" })} className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-[11px] font-semibold text-purple-200 disabled:opacity-40">Improve with AI</button>
                <button type="button" disabled={!textProvider || isPending} onClick={() => runDraftAction(improveDraftAction, { instruction: "Regenerate this draft body from the attached source data. Preserve exact verified metrics and include a no-proof disclaimer.", provider_name: textProvider?.provider_name ?? "anthropic" })} className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200 disabled:opacity-40">Regenerate with Model</button>
                <button type="submit" disabled={!canEdit || isPending} className="rounded-lg border border-blue-500/50 bg-blue-500/15 px-4 py-2 text-[11px] font-bold text-blue-100 disabled:opacity-40">Save Draft</button>
                <button type="submit" disabled={!canEdit || isPending} className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-4 py-2 text-[11px] font-bold text-teal-100 disabled:opacity-40">Save Draft and Keep Reviewing</button>
              </div>
            </div>
          </Panel>
          <div className="space-y-4">
            <Panel>
              <PanelTitle title="Source Data" help={<PanelHelp title="Source Data" description="Verified engine information behind this draft. It is read-only so published content remains tied to actual computation records." />} action={<span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-200">{sourceType(selectedDraft)}</span>} />
              <div className="space-y-3 p-4 text-[11px]">
                {selectedDraft.source_data ? (
                  <>
                    {Object.entries(selectedDraft.source_data).slice(0, 8).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 border-b border-slate-800 pb-2">
                        <span className="text-slate-500">{titleCase(key)}</span>
                        <span className="max-w-[180px] truncate text-right font-semibold text-slate-200">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                    <details className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <summary className="cursor-pointer text-cyan-300">View Full Source Data</summary>
                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] text-slate-400">{sourceJson}</pre>
                    </details>
                  </>
                ) : (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200">
                    No source data attached. This draft can be saved, but cannot be approved until required source data is attached.
                  </div>
                )}
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Image" help={<PanelHelp title="Image Panel" description="Prepares platform-specific visual assets. Until OpenAI image generation is configured, this area shows a placeholder instead of a generated image." />} action={<span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold text-purple-200">{imageProvider ? "OpenAI ready" : "Placeholder"}</span>} />
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <span>Preset: <b className="text-slate-300">{selectedPreset?.name ?? "None selected"}</b></span>
                  <span>Ratio: <b className="text-slate-300">{selectedPreset?.aspect_ratio ?? "—"}</b></span>
                  <span>Dimensions: <b className="text-slate-300">{selectedPreset ? `${selectedPreset.width} x ${selectedPreset.height}` : "—"}</b></span>
                  <span>Status: <b className={selectedDraft.image_url ? "text-green-300" : "text-amber-300"}>{imageStatus(selectedDraft, selectedProfile ?? undefined, selectedPreset ?? undefined)}</b></span>
                </div>
                {selectedDraft.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedDraft.image_url} alt="" className="aspect-video w-full rounded-lg border border-slate-800 object-cover" />
                ) : (
                  <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-teal-500/20 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.22),transparent_30%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]">
                    <div className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: "linear-gradient(rgba(45,212,191,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,.6) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                    <div className="relative text-center">
                      <ImageIcon className="mx-auto h-8 w-8 text-teal-300" />
                      <p className="mt-3 text-sm font-bold text-slate-100">Image placeholder</p>
                      <p className="mt-1 text-[11px] text-slate-500">{selectedPreset ? `${selectedPreset.width} x ${selectedPreset.height}` : "Select an image preset"}</p>
                      <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-slate-500">Connect OpenAI image provider to generate this asset.</p>
                    </div>
                  </div>
                )}
                <label>
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Image Prompt</span>
                  <textarea name="image_prompt" defaultValue={selectedDraft.image_prompt ?? ""} rows={5} disabled={!canEdit} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={!imageProvider || !selectedDraft.image_prompt || isPending} onClick={() => {
                    const fd = new FormData();
                    fd.append("draft_id", selectedDraft.id);
                    fd.append("prompt", selectedDraft.image_prompt ?? "");
                    fd.append("width", String(selectedPreset?.width ?? 1200));
                    fd.append("height", String(selectedPreset?.height ?? 630));
                    fd.append("target", selectedPreset?.target ?? "blog");
                    startTransition(async () => {
                      const result = await generateImageAction(fd);
                      setMessage(result.ok ? "Image generated and attached." : result.error ?? "Image generation failed.");
                    });
                  }} className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-[10px] font-semibold text-purple-200 disabled:opacity-40">Generate Image</button>
                  <button type="button" disabled={!imageProvider || !selectedDraft.image_url} className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-400 disabled:opacity-40">Regenerate Image</button>
                  <button type="button" disabled className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-500 opacity-50">Generate New Prompt</button>
                  <button type="button" disabled={!selectedDraft.image_url} className="rounded-lg border border-red-500/30 px-3 py-2 text-[10px] font-semibold text-red-300 disabled:opacity-40">Remove Image</button>
                </div>
              </div>
            </Panel>
          </div>
          <div className="space-y-4">
            <Panel>
              <PanelTitle title="Guardrails Checklist" help={<PanelHelp title="Guardrails Checklist" description="Checks for proof claims, unsupported claims, source data, required images, approval rules, and audit retention. Hard failures block approval but still allow saving." />} action={<button type="button" onClick={() => runDraftAction(runGuardrailsAction)} className="rounded border border-teal-500/40 px-2 py-1 text-[10px] text-teal-200">Run Check</button>} />
              <div className="space-y-2 p-4">
                {selectedGuardrails?.rules.map((rule) => {
                  const hardFail = !rule.passed && ["no_solution_claims", "no_unsupported_claims", "source_data_attached", "approval_before_publish"].includes(rule.id);
                  return (
                    <div key={rule.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
                      <div className="flex gap-2">
                        {rule.passed ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-green-300" /> : hardFail ? <X className="mt-0.5 h-3.5 w-3.5 text-red-300" /> : <RefreshCw className="mt-0.5 h-3.5 w-3.5 text-amber-300" />}
                        <div>
                          <p className="text-[11px] font-semibold text-slate-200">{rule.label}</p>
                          {rule.detail && <p className="mt-0.5 text-[10px] text-slate-500">{rule.detail}</p>}
                        </div>
                      </div>
                      <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold", rule.passed ? "border-green-500/30 bg-green-500/10 text-green-300" : hardFail ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300")}>{rule.passed ? "Pass" : hardFail ? "Fail" : "Warning"}</span>
                    </div>
                  );
                })}
                {profileRequiresImage && !selectedDraft.image_url && <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-200">This profile requires an image before approval.</p>}
              </div>
            </Panel>
            <Panel>
              <PanelTitle title="Export / Actions" help={<PanelHelp title="Export / Actions" description="Manual copy and file export options. Direct API posting is not enabled in this phase, and mark published/exported requires approved status." />} />
              <div className="space-y-2 p-4">
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-[11px] font-semibold text-blue-200"><Check className="h-3.5 w-3.5" /> Save Draft</button>
                <button type="button" disabled={isPending} onClick={() => runDraftAction(approveDraftAction)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-[11px] font-semibold text-green-200 disabled:opacity-40"><Check className="h-3.5 w-3.5" /> Approve Draft</button>
                <button type="button" onClick={() => runDraftAction(rejectDraftAction, { review_notes: selectedDraft.review_notes ?? "" })} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-200"><X className="h-3.5 w-3.5" /> Reject Draft</button>
                <button type="button" onClick={() => runDraftAction(archiveDraftAction)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-semibold text-slate-300"><Archive className="h-3.5 w-3.5" /> Archive Draft</button>
                <button type="button" onClick={() => runDraftAction(reopenDraftAction)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-[11px] font-semibold text-amber-200">Reopen for Review</button>
                <button type="button" disabled={selectedDraft.status !== "approved"} onClick={() => runDraftAction(markPublishedAction)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-[11px] font-semibold text-teal-200 disabled:opacity-40">Mark Published / Exported</button>
                <div className="pt-3">
                  {([
                    ["Copy Markdown", Clipboard, () => copyText(selectedMarkdown)],
                    ["Copy Plain Text", FileText, () => copyText(selectedPlain)],
                    ["Copy HTML", Link2, () => copyText(selectedHtml)],
                    ["Copy Image Prompt", ImageIcon, () => copyText(selectedDraft.image_prompt ?? "")],
                    ["Copy Source Data JSON", FileJson, () => copyText(sourceJson)],
                    ["Download .md", Download, () => downloadText(`${selectedDraft.title}.md`, selectedMarkdown, "text/markdown")],
                    ["Download .txt", Download, () => downloadText(`${selectedDraft.title}.txt`, selectedPlain, "text/plain")],
                    ["Download .json", Download, () => downloadText(`${selectedDraft.title}.json`, JSON.stringify({ draft: selectedDraft, source_data: selectedDraft.source_data }, null, 2), "application/json")],
                  ] as Array<[string, ComponentType<LucideProps>, () => void]>).map(([label, Icon, fn]) => (
                    <button key={label} type="button" onClick={fn} className="mb-1.5 flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-[10px] text-slate-300 hover:border-cyan-500/30">
                      <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span><ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
          <Panel>
            <PanelTitle title="AI Content Actions" help={<PanelHelp title="AI Content Actions" description="Creates or updates drafts only. Actions are disabled when no text provider is configured and never approve or publish content." />} />
            <div className="space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ["Generate Blog Post", "blog_post"],
                  ["Create LinkedIn Post", "linkedin_post"],
                  ["Create X Thread", "x_thread"],
                  ["Generate Weekly Report", "weekly_report"],
                  ["Improve This Draft", "improve"],
                ].map(([label, type]) => (
                  <button key={label} type="button" disabled={!textProvider && type === "improve"} onClick={() => type === "improve" ? runDraftAction(improveDraftAction) : createDraft(type as ContentType)} className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-3 text-[11px] font-semibold text-slate-200 hover:border-teal-500/40 disabled:opacity-40">
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {["Summarize this record", "Focus on trajectory length", "Explain for non-math audience", "Add engagement hook", "Add disclaimer", "Make it more concise", "Make it more analytical"].map((chip) => (
                  <button key={chip} type="button" disabled={!textProvider} onClick={() => runDraftAction(improveDraftAction, { instruction: chip })} className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] text-cyan-200 disabled:opacity-40">{chip}</button>
                ))}
              </div>
            </div>
          </Panel>
          <Panel>
            <PanelTitle title="Review Notes / History" help={<PanelHelp title="Review Notes and History" description="Review notes are editable. History uses audit events when available, and falls back to real timestamps/status fields without inventing events." />} />
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Review Notes</span>
                <textarea name="review_notes" defaultValue={selectedDraft.review_notes ?? ""} rows={7} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none" />
              </label>
              <div className="text-[11px]">
                <p className="mb-2 font-semibold text-slate-300">History</p>
                <div className="space-y-2">
                  <div className="flex justify-between gap-4"><span className="text-slate-400">Draft created</span><span className="text-slate-600">{fmtDate(selectedDraft.created_at)}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-slate-400">Last updated</span><span className="text-slate-600">{fmtDate(selectedDraft.updated_at)}</span></div>
                  {selectedDraft.approved_at && <div className="flex justify-between gap-4"><span className="text-green-300">Approved</span><span className="text-slate-600">{fmtDate(selectedDraft.approved_at)}</span></div>}
                  {selectedDraft.published_at && <div className="flex justify-between gap-4"><span className="text-cyan-300">Published / exported</span><span className="text-slate-600">{fmtDate(selectedDraft.published_at)}</span></div>}
                  {!selectedDraft.approved_at && !selectedDraft.published_at && <p className="text-slate-600">No review history yet.</p>}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </form>
    );
  }

  function renderNotes() {
    return (
      <Panel>
        <PanelTitle title="AI Notes" help={<PanelHelp title="AI Notes" description="Internal observations from verified engine events. Notes can be reviewed, archived, or used to seed drafts without inventing source data." />} />
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {notes.length === 0 ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No AI notes yet.</p> : notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-100">{note.title}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{titleCase(note.note_type)} · {titleCase(note.severity)} · {fmtDate(note.created_at)}</p>
                </div>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-400">{titleCase(note.status)}</span>
              </div>
              <p className="mt-3 line-clamp-4 text-[11px] leading-relaxed text-slate-400">{note.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => createDraft("blog_post")} className="rounded border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[10px] text-teal-200">Convert to Draft</button>
                <button onClick={() => {
                  const fd = new FormData();
                  fd.append("id", note.id);
                  fd.append("status", "reviewed");
                  startTransition(async () => { const r = await updateNoteStatusAction(fd); setMessage(r.ok ? "Note marked reviewed." : r.error ?? "Unable to update note."); });
                }} className="rounded border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">Mark Reviewed</button>
                <button onClick={() => {
                  const fd = new FormData();
                  fd.append("id", note.id);
                  fd.append("status", "archived");
                  startTransition(async () => { const r = await updateNoteStatusAction(fd); setMessage(r.ok ? "Note archived." : r.error ?? "Unable to archive note."); });
                }} className="rounded border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">Archive</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  function renderReports() {
    const reportDrafts = drafts.filter((draft) => draft.content_type === "weekly_report" || draft.content_type === "observatory_report");
    return (
      <Panel>
        <PanelTitle title="Reports" help={<PanelHelp title="Reports" description="Weekly and Observatory report drafts. Generation creates review drafts only and never publishes automatically." />} action={<button onClick={() => createDraft("weekly_report")} className="rounded border border-teal-500/40 px-2.5 py-1 text-[10px] text-teal-200">Generate Weekly Report Foundation</button>} />
        <div className="p-4">
          {reportDrafts.length === 0 ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No report drafts yet.</p> : (
            <div className="grid gap-2">{reportDrafts.map((draft) => <button key={draft.id} onClick={() => { setSelectedDraftId(draft.id); setActiveTab("editor"); }} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-teal-500/40"><p className="font-semibold text-slate-100">{draft.title}</p><p className="mt-1 text-[10px] text-slate-500">{titleCase(draft.status)} · Updated {age(draft.updated_at)}</p></button>)}</div>
          )}
        </div>
      </Panel>
    );
  }

  function renderPublished() {
    const published = drafts.filter((draft) => draft.status === "approved" || draft.status === "published");
    return (
      <Panel>
        <PanelTitle title="Published / Exported" help={<PanelHelp title="Published / Exported" description="Approved and published drafts eligible for manual export or public Observatory display. Drafts and rejected content are excluded." />} />
        <div className="p-4">
          {published.length === 0 ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No approved or published content yet.</p> : (
            <div className="grid gap-2">{published.map((draft) => <button key={draft.id} onClick={() => { setSelectedDraftId(draft.id); setActiveTab("editor"); }} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-teal-500/40"><div className="flex justify-between gap-3"><p className="font-semibold text-slate-100">{draft.title}</p><StatusBadge status={draft.status} /></div><p className="mt-1 text-[10px] text-slate-500">{titleCase(draft.content_type)} · {fmtDate(draft.published_at ?? draft.approved_at ?? draft.updated_at)}</p></button>)}</div>
          )}
        </div>
      </Panel>
    );
  }
}
