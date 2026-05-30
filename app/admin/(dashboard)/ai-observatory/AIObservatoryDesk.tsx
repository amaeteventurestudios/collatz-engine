"use client";

import { useState, useTransition, type ComponentType } from "react";
import Link from "next/link";
import {
  Archive,
  Book,
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
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { checkDraftGuardrails } from "@/lib/ai-observatory/guardrails";
import type {
  AIBrandVoiceProfile,
  AIDraftAuditEvent,
  AIDraftRow,
  AIImagePreset,
  AIModelSetting,
  AINoteRow,
  AIObservatorySettings,
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
import type { EngineAdminState } from "@/lib/admin/types";
import type { TopicSeed, TopicCategory } from "@/lib/ai-observatory/content-radar";
import { AIStudioClient } from "./AIStudioClient";
import {
  approveDraftAction,
  archiveDraftAction,
  createBlankDraftAction,
  createDraftFromTopicAction,
  generateImageAction,
  improveDraftAction,
  markPublishedAction,
  rejectDraftAction,
  reopenDraftAction,
  runGuardrailsAction,
  saveDraftAction,
  saveObservatorySettingsAction,
  updateNoteStatusAction,
} from "./actions";

// ── Types ──────────────────────────────────────────────────────────────────────

type MainTab = "overview" | "radar" | "queue" | "editor" | "notes" | "reports" | "published" | "studio" | "usage" | "settings";
type QueueFilter = "all" | DraftStatus | "published_exported";
type SortMode = "updated" | "created" | "status" | "content_type";
type RadarFilter = "all" | TopicCategory;

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
  /** Kept for backward compatibility with callers; use engineState for display. */
  engineStatus?: string;
  /** Kept for backward compatibility with callers. */
  workerLockStatus?: string;
  providerCapabilities: Record<ProviderName, ProviderCapabilities>;
  engineState: EngineAdminState | null;
  observatorySettings: AIObservatorySettings;
  topicSuggestions: TopicSeed[];
  recentActivity: AIDraftAuditEvent[];
}

// ── Constants ──────────────────────────────────────────────────────────────────

const mainTabs: { id: MainTab; label: string }[] = [
  { id: "overview",   label: "Overview"           },
  { id: "radar",      label: "Content Radar"      },
  { id: "queue",      label: "Draft Queue"        },
  { id: "editor",     label: "Draft Editor"       },
  { id: "notes",      label: "AI Notes"           },
  { id: "reports",    label: "Reports"            },
  { id: "published",  label: "Published"          },
  { id: "studio",     label: "AI Studio"          },
  { id: "usage",      label: "Usage"              },
  { id: "settings",   label: "Settings"           },
];

const contentTypes: ContentType[] = [
  "blog_post", "linkedin_post", "linkedin_article", "x_post", "x_thread",
  "weekly_report", "observatory_report",
];

const radarFilters: { id: RadarFilter; label: string }[] = [
  { id: "all",            label: "All"            },
  { id: "record",         label: "Records"        },
  { id: "progress",       label: "Progress"       },
  { id: "near_escape",    label: "Near-Escape"    },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "education",      label: "Education"      },
  { id: "visual",         label: "Visuals"        },
];

// ── Utilities ──────────────────────────────────────────────────────────────────

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
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
  const m = Math.max(0, Math.floor(diff / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function titleCase(v: string) {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtN(n: number | null | undefined): string {
  const v = n ?? 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString("en-US");
}
function uptimeStr(startedAt: string | null | undefined): string {
  if (!startedAt) return "—";
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalH = Math.floor(ms / 3_600_000);
  const d = Math.floor(totalH / 24);
  const h = totalH % 24;
  if (d > 0) return `${d}d ${h}h`;
  return `${totalH}h`;
}
function copyText(text: string) { void navigator.clipboard?.writeText(text); }
function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function markdownToText(md: string) {
  return md.replace(/```[\s\S]*?```/g, "").replace(/[#>*_`[\]()]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
function markdownToHtml(md: string) {
  const e = md.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return e.split(/\n{2,}/).map((b) => {
    if (b.startsWith("### ")) return `<h3>${b.slice(4)}</h3>`;
    if (b.startsWith("## "))  return `<h2>${b.slice(3)}</h2>`;
    if (b.startsWith("# "))   return `<h1>${b.slice(2)}</h1>`;
    return `<p>${b.replace(/\n/g,"<br />")}</p>`;
  }).join("\n");
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-slate-800/90 bg-[#0e1a2e]/80 shadow-2xl shadow-slate-950/30 backdrop-blur", className)}>
      {children}
    </section>
  );
}

function PanelTitle({ title, help, action }: { title: string; help?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
        {help}
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    draft:        "border-slate-600 bg-slate-700/30 text-slate-300",
    needs_review: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    approved:     "border-green-500/40 bg-green-500/15 text-green-300",
    published:    "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    rejected:     "border-red-500/40 bg-red-500/15 text-red-300",
    archived:     "border-slate-700 bg-slate-950 text-slate-500",
  };
  return <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase", s[status] ?? s.draft)}>{titleCase(status)}</span>;
}

function modePillClass(mode: string) {
  if (mode === "autonomous")     return "border-purple-500/50 bg-purple-500/15 text-purple-200";
  if (mode === "semi_auto")      return "border-teal-500/40 bg-teal-500/10 text-teal-200";
  if (mode === "emergency_hold") return "border-amber-500/50 bg-amber-500/15 text-amber-200";
  return "border-slate-700 bg-slate-800/50 text-slate-300"; // manual
}

function modeLabel(mode: string) {
  if (mode === "autonomous")     return "Autonomous";
  if (mode === "semi_auto")      return "Semi-Auto";
  if (mode === "emergency_hold") return "Emergency Hold";
  return "Manual";
}

function categoryIcon(cat: TopicCategory) {
  if (cat === "record")         return <Trophy className="h-3.5 w-3.5" />;
  if (cat === "near_escape")    return <Zap className="h-3.5 w-3.5" />;
  if (cat === "progress")       return <TrendingUp className="h-3.5 w-3.5" />;
  if (cat === "infrastructure") return <Shield className="h-3.5 w-3.5" />;
  if (cat === "education")      return <Book className="h-3.5 w-3.5" />;
  return <Sparkles className="h-3.5 w-3.5" />;
}

function categoryColor(cat: TopicCategory) {
  if (cat === "record")         return "border-amber-500/50  bg-amber-500/10  text-amber-300";
  if (cat === "near_escape")    return "border-purple-500/50 bg-purple-500/10 text-purple-300";
  if (cat === "progress")       return "border-teal-500/40   bg-teal-500/10   text-teal-300";
  if (cat === "infrastructure") return "border-blue-500/40   bg-blue-500/10   text-blue-300";
  if (cat === "education")      return "border-sky-500/40    bg-sky-500/10    text-sky-300";
  return "border-slate-600 bg-slate-800/40 text-slate-300";
}

function priorityBadge(priority: string) {
  if (priority === "high")   return <span className="rounded-full border border-amber-500/40  bg-amber-500/10  px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-300">High</span>;
  if (priority === "medium") return <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-purple-300">Medium</span>;
  return <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-blue-300">Low</span>;
}

function topicBorderClass(priority: string) {
  if (priority === "high")   return "border-amber-500/30  hover:border-amber-500/60";
  if (priority === "medium") return "border-purple-500/20 hover:border-purple-500/50";
  return "border-blue-500/15 hover:border-blue-500/40";
}

function imageStatus(draft: AIDraftRow, profile?: AIPublishingProfile, preset?: AIImagePreset) {
  if (!profile?.requires_image && !preset?.required) return "Image Not Required";
  if (draft.image_url) return "Image Ready";
  if (draft.image_prompt) return "Prompt Set";
  return "Image Missing";
}

function sourceType(draft: AIDraftRow) {
  const raw = String(draft.source_data?.source_type ?? draft.source_data?.type ?? "");
  if (draft.source_note_id) return "AI Note";
  if (!draft.source_data) return "Manual Draft";
  if (raw.includes("near")) return "Near-Escape";
  if (raw.includes("weekly") || raw.includes("report")) return "Weekly Report";
  if (raw.includes("record") || raw.includes("trajectory")) return "Record Event";
  return raw ? titleCase(raw) : "System Summary";
}

function activityLabel(event_type: string) {
  const map: Record<string, string> = {
    draft_created:      "Draft created",
    draft_updated:      "Draft updated",
    status_approved:    "Draft approved",
    status_published:   "Draft published",
    status_rejected:    "Draft rejected",
    status_archived:    "Draft archived",
    status_needs_review:"Sent for review",
    text_generated:     "Text generated",
    image_generated:    "Image generated",
    guardrails_checked: "Guardrails checked",
  };
  return map[event_type] ?? titleCase(event_type);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AIObservatoryDesk({
  stats, drafts, notes, providers, modelSettings, brandVoices,
  templates, imagePresets, publishingProfiles, encryptionReady,
  tablesReady, providerCapabilities,
  engineState, observatorySettings, topicSuggestions, recentActivity,
}: Props) {
  const [activeTab,       setActiveTab]       = useState<MainTab>("radar");
  const [selectedDraftId, setSelectedDraftId] = useState(drafts[0]?.id ?? "");
  const [filter,          setFilter]          = useState<QueueFilter>("all");
  const [sort,            setSort]            = useState<SortMode>("updated");
  const [search,          setSearch]          = useState("");
  const [editorView,      setEditorView]      = useState<"markdown"|"preview"|"plain"|"html"|"social">("markdown");
  const [radarFilter,     setRadarFilter]     = useState<RadarFilter>("all");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [message,         setMessage]         = useState<string | null>(null);
  const [isPending,       startTransition]    = useTransition();

  const textProvider  = providers.find((p) => p.enabled && p.api_key_masked && providerCapabilities[p.provider_name]?.text);
  const imageProvider = providers.find((p) => p.provider_name === "openai" && p.enabled && p.api_key_masked);
  const selectedDraft = drafts.find((d) => d.id === selectedDraftId) ?? null;
  const mode          = observatorySettings.publishing_mode;

  const profileFor = (d: AIDraftRow | null | undefined) =>
    publishingProfiles.find((p) => p.id === d?.publishing_profile_id)
    ?? publishingProfiles.find((p) => p.content_type === d?.content_type)
    ?? null;

  const presetFor = (d: AIDraftRow | null | undefined) => {
    const profile = profileFor(d);
    return imagePresets.find((p) => p.id === d?.image_preset_id)
      ?? imagePresets.find((p) => p.id === profile?.default_image_preset_id)
      ?? imagePresets.find((p) => p.target === profile?.content_type || p.target === profile?.target)
      ?? null;
  };

  const filteredDrafts = drafts
    .filter((d) => {
      if (filter === "published_exported" && d.status !== "published") return false;
      if (filter !== "all" && filter !== "published_exported" && d.status !== filter) return false;
      const profile = profileFor(d);
      const hay = [d.title, d.content_type, d.status, profile?.name, profile?.target].join(" ").toLowerCase();
      const q = search.trim().toLowerCase();
      return !q || hay.includes(q);
    })
    .sort((a, b) => {
      if (sort === "created")      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "status")       return a.status.localeCompare(b.status);
      if (sort === "content_type") return a.content_type.localeCompare(b.content_type);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const selectedProfile   = profileFor(selectedDraft);
  const selectedPreset    = presetFor(selectedDraft);
  const selectedGuardrails = selectedDraft ? checkDraftGuardrails(selectedDraft) : null;
  const selectedMarkdown  = selectedDraft?.body_markdown ?? "";
  const selectedPlain     = selectedDraft?.body_plain_text ?? markdownToText(selectedMarkdown);
  const selectedHtml      = selectedDraft?.body_html ?? markdownToHtml(selectedMarkdown);
  const selectedTags      = selectedDraft?.tags?.join(", ") ?? "";
  const words = selectedPlain.split(/\s+/).filter(Boolean).length;
  const chars = selectedPlain.length;

  const filteredTopics = radarFilter === "all"
    ? topicSuggestions
    : topicSuggestions.filter((t) => t.category === radarFilter);
  const selectedTopic = topicSuggestions.find((t) => t.id === selectedTopicId) ?? null;

  const setupItems = [
    { label: "Run Supabase migration",        state: tablesReady   ? "Done" : "Missing",  detail: "supabase/phase-3a-ai-observatory.sql", command: "supabase/phase-3a-ai-observatory.sql" },
    { label: "Set AI_SETTINGS_ENCRYPTION_KEY", state: encryptionReady ? "Done" : "Missing", detail: "64-char hex key in .env.local", command: "openssl rand -hex 32" },
    { label: "Add OpenAI key",                 state: imageProvider ? "Done" : "Missing",  detail: "AI Studio → Providers", command: "" },
    { label: "Add text provider key",          state: textProvider  ? "Done" : "Optional", detail: "Anthropic or OpenAI", command: "" },
    { label: "Test providers",                 state: providers.some(p => p.last_test_status === "ok") ? "Done" : "Optional", detail: "AI Studio → Providers → Test Connection", command: "" },
    { label: "Generate first draft",           state: drafts.length > 0 ? "Done" : "Missing", detail: "Use Content Radar → Create Draft", command: "" },
  ];

  function runDraftAction(action: (fd: FormData) => Promise<{ ok: boolean; error?: string; id?: string; summary?: string }>, extra?: Record<string, string>) {
    if (!selectedDraft) return;
    const fd = new FormData();
    fd.append("id", selectedDraft.id);
    Object.entries(extra ?? {}).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const r = await action(fd);
      setMessage(r.ok ? (r.summary ?? "Done.") : (r.error ?? "Action failed."));
    });
  }

  function createDraft(contentType: ContentType = "blog_post") {
    const fd = new FormData();
    fd.append("content_type", contentType);
    fd.append("title", `Untitled ${titleCase(contentType)}`);
    const profile = publishingProfiles.find((p) => p.content_type === contentType);
    if (profile) fd.append("publishing_profile_id", profile.id);
    startTransition(async () => {
      const r = await createBlankDraftAction(fd);
      if (r.ok && r.id) { setSelectedDraftId(r.id); setActiveTab("editor"); setMessage("Draft created."); }
      else setMessage(r.error ?? "Unable to create draft.");
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-[1920px] space-y-4 px-4 py-5 sm:px-5 lg:px-7">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">AI Observatory</h1>
            <PanelHelp title="AI Observatory" description="Autonomous content desk for insights, reports, and drafts from verified Collatz Engine data." operatorNote="Content only publishes when guardrails pass and the mode allows it." />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">Autonomous insights, reports, and content from verified Collatz Engine data.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Text provider */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-[10px]">
            <span className={cx("h-1.5 w-1.5 rounded-full", textProvider ? "bg-green-400" : "bg-amber-400")} />
            <span className="text-slate-500 font-medium">Text:</span>
            <span className="font-bold text-slate-200">{textProvider?.display_name ?? "Not configured"}</span>
          </div>
          {/* Image provider */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2.5 py-1.5 text-[10px]">
            <span className={cx("h-1.5 w-1.5 rounded-full", imageProvider ? "bg-green-400" : "bg-amber-400")} />
            <span className="text-slate-500 font-medium">Images:</span>
            <span className="font-bold text-slate-200">{imageProvider ? "OpenAI" : "Not configured"}</span>
          </div>
          {/* Guardrails */}
          <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/5 px-2.5 py-1.5 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <span className="font-bold text-green-300">Guardrails: Active</span>
          </div>
          {/* Mode pill */}
          <div className={cx("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold", modePillClass(mode))}>
            Mode: {modeLabel(mode)}
          </div>
          <button onClick={() => setActiveTab("studio")} className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-[10px] font-semibold text-purple-200 hover:bg-purple-500/20">
            AI Studio
          </button>
          <Link href="/observatory" className="rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400 hover:border-teal-500/40 hover:text-teal-300">
            Public Observatory
          </Link>
        </div>
      </div>

      {/* ── Setup checklist ──────────────────────────────────────────── */}
      {(!tablesReady || !encryptionReady || !textProvider || !imageProvider || drafts.length === 0) && (
        <Panel className="border-amber-500/20 bg-amber-950/10">
          <PanelTitle
            title="Setup Checklist"
            help={<PanelHelp title="Setup Checklist" description="Complete these steps to unlock the full autonomous observatory workflow." />}
            action={<button onClick={() => setActiveTab("studio")} className="text-[10px] font-semibold text-teal-300 hover:underline">AI Studio → Providers</button>}
          />
          <div className="grid gap-2.5 p-4 md:grid-cols-2 xl:grid-cols-3">
            {setupItems.map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-slate-200">{item.label}</p>
                  <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase",
                    item.state === "Done"     && "border-green-500/30 bg-green-500/10 text-green-300",
                    item.state === "Missing"  && "border-amber-500/30 bg-amber-500/10 text-amber-300",
                    item.state === "Optional" && "border-slate-600 bg-slate-800 text-slate-400",
                  )}>{item.state}</span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{item.detail}</p>
                {item.command && (
                  <button onClick={() => copyText(item.command)} className="mt-1.5 rounded border border-slate-700 bg-slate-950 px-2 py-0.5 font-mono text-[9px] text-cyan-300 hover:border-cyan-500/40">{item.command}</button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-0.5 overflow-x-auto rounded-xl border border-slate-800 bg-[#070e1a]/80 p-1">
        {mainTabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cx("shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-all",
              activeTab === tab.id
                ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/40"
                : "text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Global message banner ──────────────────────────────────── */}
      {message && (
        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-950/20 px-4 py-2.5 text-[11px] text-cyan-200">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="ml-4 text-cyan-400 hover:text-cyan-100">×</button>
        </div>
      )}

      {/* ── Tab content ────────────────────────────────────────────── */}
      {activeTab === "overview"   && renderOverview()}
      {activeTab === "radar"      && renderRadar()}
      {activeTab === "queue"      && renderQueuePanel(false)}
      {activeTab === "editor"     && renderEditorFull()}
      {activeTab === "notes"      && renderNotes()}
      {activeTab === "reports"    && renderReports()}
      {activeTab === "published"  && renderPublished()}
      {activeTab === "studio"     && (
        <AIStudioClient
          providers={providers} modelSettings={modelSettings} brandVoices={brandVoices}
          templates={templates} imagePresets={imagePresets} publishingProfiles={publishingProfiles}
          encryptionReady={encryptionReady} defaultBrandVoice={DEFAULT_BRAND_VOICE}
          providerCapabilities={providerCapabilities}
        />
      )}
      {activeTab === "usage"      && renderUsage()}
      {activeTab === "settings"   && renderSettings()}
    </div>
  );

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  OVERVIEW TAB                                                    ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderOverview() {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {([
            ["AI Notes",           stats.notesCount,       "text-teal-300"  ],
            ["Drafts",             stats.draftsCount,      "text-cyan-300"  ],
            ["Needs Review",       stats.needsReviewCount, "text-amber-300" ],
            ["Approved",           stats.approvedCount,    "text-green-300" ],
            ["Published",          stats.publishedCount,   "text-blue-300"  ],
            ["Images Generated",   stats.imagesGenerated,  "text-purple-300"],
            ["Reports Generated",  stats.reportsGenerated, "text-sky-300"   ],
            ["Archived / Rejected",stats.rejectedCount,    "text-slate-400" ],
          ] as Array<[string, number, string]>).map(([label, value, color]) => (
            <Panel key={label} className="p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
              <p className={cx("mt-2 text-2xl font-black tabular-nums", color)}>{value}</p>
            </Panel>
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
          {renderQueuePanel(true)}
          <Panel>
            <PanelTitle title="Publishing Targets" help={<PanelHelp title="Publishing Targets" description="Manual export destinations. Direct platform posting is not enabled." />} />
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {[
                ["Website",            "Public Observatory — approved/published drafts only."],
                ["Ghost / AMAETE.com", "Manual markdown + feature image URL."],
                ["LinkedIn",           "Manual plain-text post or article package."],
                ["X / Twitter",        "Manual short post or thread with char counts."],
                ["Export Files",       "Download .md, .txt, .html, or .json."],
                ["Substack",           "Manual cover image + markdown when profile exists."],
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
    );
  }

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  CONTENT RADAR TAB                                               ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderRadar() {
    return (
      <div className="space-y-4">
        {/* Filter row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {radarFilters.map((f) => (
              <button key={f.id} onClick={() => setRadarFilter(f.id)}
                className={cx("rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  radarFilter === f.id
                    ? "border-teal-500/50 bg-teal-500/15 text-teal-200"
                    : "border-slate-800 text-slate-500 hover:text-slate-200"
                )}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400 hover:border-teal-500/30 hover:text-teal-300">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>

        {/* 4-column desk layout */}
        <div className="grid gap-4 2xl:grid-cols-[280px_minmax(0,1fr)_320px_296px] xl:grid-cols-[260px_minmax(0,1fr)_300px]">

          {/* LEFT — Content Radar cards */}
          <div className="flex flex-col gap-3">
            <Panel className="flex flex-col">
              <PanelTitle
                title="Content Radar"
                help={<PanelHelp title="Content Radar" description="AI-detected publishing opportunities from live engine activity. Topics are generated from real data only." />}
                action={<span className="text-[9px] text-slate-600">{filteredTopics.length} topics</span>}
              />
              <p className="px-4 pt-2 pb-1 text-[10px] text-slate-600">AI-detected opportunities from live engine activity.</p>
              <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 max-h-[640px]">
                {filteredTopics.length === 0 ? (
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-6 text-center">
                    <p className="text-[11px] font-semibold text-slate-400">No topics detected yet.</p>
                    <p className="mt-1 text-[10px] text-slate-600">Topics appear when the engine produces records, progress milestones, or near-escape candidates.</p>
                  </div>
                ) : filteredTopics.map((topic) => (
                  <button key={topic.id} onClick={() => { setSelectedTopicId(topic.id); setMessage(null); }}
                    className={cx(
                      "w-full rounded-lg border bg-slate-950/60 p-3 text-left transition-all",
                      selectedTopicId === topic.id
                        ? "border-teal-400/60 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]"
                        : topicBorderClass(topic.priority),
                    )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className={cx("flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase", categoryColor(topic.category))}>
                        {categoryIcon(topic.category)}
                        {titleCase(topic.category.replace("_", " "))}
                      </div>
                      {priorityBadge(topic.priority)}
                    </div>
                    <p className="mt-2 text-[11px] font-bold leading-snug text-slate-100">{topic.title}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">{topic.summary}</p>
                    <p className="mt-1.5 text-[9px] text-slate-600">{topic.detail}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {topic.suggested_formats.slice(0, 3).map((f) => (
                        <span key={f} className="rounded border border-slate-700 px-1.5 py-0.5 text-[8px] text-slate-400">{titleCase(f)}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            {/* Engine State mini card */}
            {renderEngineStateCard()}
          </div>

          {/* CENTER — Draft Editor inline */}
          <form action={async (fd) => {
            const r = await saveDraftAction(fd);
            setMessage(r.ok ? "Draft saved." : (r.error ?? "Save failed."));
          }} className="contents">
            <input type="hidden" name="id" value={selectedDraft?.id ?? ""} />
            {selectedDraft
              ? renderEditorCenter()
              : renderEditorCenterEmpty()
            }
            {/* RIGHT — Image panel (2xl+ only shows as col 3; xl wraps below editor) */}
            {selectedDraft && renderImagePanel()}
            {/* FAR RIGHT — Guardrails + Export */}
            {selectedDraft && renderGuardrailsExport()}
          </form>
        </div>

        {/* Bottom panels */}
        <div className="grid gap-4 lg:grid-cols-3">
          {renderAIContentActions()}
          {renderAutonomousPublishing()}
          {renderRecentActivity()}
        </div>
      </div>
    );
  }

  function renderEditorCenterEmpty() {
    return (
      <Panel className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
        {selectedTopic ? (
          <div className="max-w-sm space-y-4">
            <div className={cx("mx-auto flex h-10 w-10 items-center justify-center rounded-full border", categoryColor(selectedTopic.category))}>
              {categoryIcon(selectedTopic.category)}
            </div>
            <p className="text-base font-bold text-slate-100">{selectedTopic.title}</p>
            <p className="text-[11px] leading-relaxed text-slate-500">{selectedTopic.summary}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedTopic.suggested_formats.map((fmt) => (
                <button key={fmt} onClick={() => {
                  const fd = new FormData();
                  fd.append("title", selectedTopic.title);
                  fd.append("content_type", fmt as ContentType);
                  fd.append("source_data", JSON.stringify(selectedTopic.source_data));
                  fd.append("publishing_mode", mode);
                  fd.append("disclosure_text", observatorySettings.disclosure_text);
                  const profile = publishingProfiles.find((p) => p.content_type === fmt);
                  if (profile) fd.append("publishing_profile_id", profile.id);
                  startTransition(async () => {
                    const r = await createDraftFromTopicAction(fd);
                    if (r.ok && r.id) { setSelectedDraftId(r.id); setSelectedTopicId(null); setMessage("Draft created from topic."); }
                    else setMessage(r.error ?? "Could not create draft.");
                  });
                }} disabled={isPending}
                className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-[11px] font-semibold text-teal-200 hover:bg-teal-500/20 disabled:opacity-40">
                  Create {titleCase(fmt)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-xs space-y-3">
            <p className="text-sm font-bold text-slate-300">Select a topic from Content Radar</p>
            <p className="text-[11px] text-slate-600">Click any topic card on the left to preview it and create a draft.</p>
            <button onClick={() => createDraft("blog_post")} className="rounded-lg border border-slate-700 px-4 py-2 text-[11px] text-slate-400 hover:border-teal-500/30 hover:text-teal-300">
              Or create a blank draft →
            </button>
          </div>
        )}
      </Panel>
    );
  }

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  DRAFT EDITOR (full-page tab)                                    ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderEditorFull() {
    if (!selectedDraft) {
      return (
        <Panel>
          <div className="flex min-h-[460px] flex-col items-center justify-center px-6 text-center">
            <p className="text-lg font-bold text-slate-200">Select a draft from the Draft Queue.</p>
            <p className="mt-2 max-w-md text-sm text-slate-500">The editor opens when you select a draft.</p>
            <button onClick={() => setActiveTab("queue")} className="mt-5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm font-semibold text-teal-200">Open Draft Queue</button>
          </div>
        </Panel>
      );
    }
    return (
      <form action={async (fd) => {
        const r = await saveDraftAction(fd);
        setMessage(r.ok ? "Draft saved." : (r.error ?? "Save failed."));
      }} className="space-y-4">
        <input type="hidden" name="id" value={selectedDraft.id} />
        <div className="grid gap-4 2xl:grid-cols-[300px_minmax(0,1fr)_320px_296px]">
          {renderQueuePanel(false)}
          {renderEditorCenter()}
          {renderImagePanel()}
          {renderGuardrailsExport()}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          {renderAIContentActions()}
          {renderReviewHistory()}
        </div>
      </form>
    );
  }

  function renderEditorCenter() {
    if (!selectedDraft) return null;
    const canEdit = !["published", "archived"].includes(selectedDraft.status);
    return (
      <Panel className="min-h-[600px]">
        <PanelTitle
          title="Draft Editor"
          help={<PanelHelp title="Draft Editor" description="Edit title, body, excerpt, tags, and profile. Source data remains read-only." />}
          action={<div className="flex items-center gap-2"><StatusBadge status={selectedDraft.status} /><span className="text-[9px] text-slate-600">ID {shortId(selectedDraft.id)}</span></div>}
        />
        <div className="space-y-3 p-4">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Title</span>
            <input name="title" defaultValue={selectedDraft.title} disabled={!canEdit}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-teal-500 disabled:opacity-60" />
          </label>
          <div className="grid gap-3 md:grid-cols-3">
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Publishing Profile</span>
              <select name="publishing_profile_id" defaultValue={selectedDraft.publishing_profile_id ?? selectedProfile?.id ?? ""} disabled={!canEdit}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                <option value="">No profile</option>
                {publishingProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Content Type</span>
              <select name="content_type" defaultValue={selectedDraft.content_type} disabled={!canEdit}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                {contentTypes.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Image Preset</span>
              <select name="image_preset_id" defaultValue={selectedDraft.image_preset_id ?? selectedPreset?.id ?? ""} disabled={!canEdit}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none">
                <option value="">No preset</option>
                {imagePresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Excerpt</span>
            <textarea name="excerpt" defaultValue={selectedDraft.excerpt ?? ""} disabled={!canEdit} rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[11px] text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
          </label>
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tags</span>
            <input name="tags" defaultValue={selectedTags} disabled={!canEdit} placeholder="collatz, computation, observatory"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[11px] text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
          </label>
          <input type="hidden" name="status" value={selectedDraft.status} />
          <input type="hidden" name="source_note_id" value={selectedDraft.source_note_id ?? ""} />

          {/* View toggle */}
          <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-800 bg-slate-950 p-1">
            {(["markdown","preview","plain","html","social"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setEditorView(v)}
                className={cx("rounded-md px-3 py-1.5 text-[10px] font-semibold",
                  editorView === v ? "bg-teal-500/15 text-teal-200" : "text-slate-500 hover:text-slate-200"
                )}>
                {titleCase(v)}
              </button>
            ))}
          </div>

          {/* Editor toolbar */}
          {editorView === "markdown" && (
            <div>
              <div className="mb-1.5 flex flex-wrap gap-1">
                {["H","B","I","List","Quote","Link","Undo","Redo"].map((t) => (
                  <button key={t} type="button" className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[10px] text-slate-400 hover:border-slate-700">{t}</button>
                ))}
              </div>
              <textarea name="body_markdown" defaultValue={selectedMarkdown} disabled={!canEdit} rows={18}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-200 outline-none focus:border-teal-500 disabled:opacity-60" />
            </div>
          )}
          {editorView === "preview" && (
            <div className="min-h-[420px] whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-sm leading-relaxed text-slate-300">
              {selectedMarkdown || "No markdown body yet."}
            </div>
          )}
          {editorView === "plain" && (
            <textarea name="body_plain_text" defaultValue={selectedPlain} disabled={!canEdit} rows={18}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-[12px] leading-relaxed text-slate-200 outline-none" />
          )}
          {editorView === "html" && (
            <textarea name="body_html" defaultValue={selectedHtml} disabled={!canEdit} rows={18}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 font-mono text-[12px] leading-relaxed text-slate-200 outline-none" />
          )}
          {editorView === "social" && (
            <div className="min-h-[420px] rounded-lg border border-slate-800 bg-slate-950 px-4 py-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-200">{selectedDraft.title}</p>
              <p className="mt-3 whitespace-pre-wrap">{selectedPlain.slice(0, 900) || "No social preview yet."}</p>
            </div>
          )}

          {/* Footer stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-[10px] text-slate-500">
            <span>Words: {words}</span>
            <span>Characters: {chars}</span>
            <span>Reading time: {Math.max(1, Math.ceil(words / 220))} min</span>
            <span>Last saved: {fmtDate(selectedDraft.updated_at)}</span>
          </div>

          {!textProvider && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              Text provider not configured. Add an API key in AI Studio → Providers.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={!textProvider || isPending} onClick={() => runDraftAction(improveDraftAction, { provider_name: textProvider?.provider_name ?? "anthropic" })}
              className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-[11px] font-semibold text-purple-200 disabled:opacity-40">
              Improve with AI
            </button>
            <button type="button" disabled={!textProvider || isPending} onClick={() => runDraftAction(improveDraftAction, { instruction: "Regenerate this draft body from the source data. Preserve exact metrics and include a no-proof disclaimer.", provider_name: textProvider?.provider_name ?? "anthropic" })}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-200 disabled:opacity-40">
              Regenerate
            </button>
            <button type="submit" disabled={!canEdit || isPending}
              className="rounded-lg border border-blue-500/50 bg-blue-500/15 px-4 py-2 text-[11px] font-bold text-blue-100 disabled:opacity-40">
              Save Draft
            </button>
            <button type="submit" disabled={!canEdit || isPending}
              className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-4 py-2 text-[11px] font-bold text-teal-100 disabled:opacity-40">
              Save &amp; Keep Reviewing
            </button>
          </div>
        </div>
      </Panel>
    );
  }

  function renderImagePanel() {
    if (!selectedDraft) return null;
    const canEdit = !["published", "archived"].includes(selectedDraft.status);
    const imgStatus = imageStatus(selectedDraft, selectedProfile ?? undefined, selectedPreset ?? undefined);

    return (
      <div className="space-y-4 hidden xl:block">
        <Panel>
          <PanelTitle
            title="Image"
            help={<PanelHelp title="Image Panel" description="Platform-specific visual asset for this draft. Requires OpenAI provider to generate." />}
            action={
              <span className={cx("rounded-full border px-2 py-0.5 text-[9px] font-bold",
                imageProvider ? "border-green-500/30 bg-green-500/10 text-green-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              )}>
                {imageProvider ? "OpenAI Ready" : "Not configured"}
              </span>
            }
          />
          <div className="space-y-3 p-4">
            {/* Preset/Ratio row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Preset</p>
                <p className="text-[11px] font-semibold text-slate-300">{selectedPreset?.name ?? "None selected"}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider">Ratio</p>
                <p className="text-[11px] font-semibold text-slate-300">{selectedPreset?.aspect_ratio ?? "—"}</p>
              </div>
            </div>

            {/* Image preview or placeholder */}
            {selectedDraft.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedDraft.image_url} alt="" className="aspect-video w-full rounded-lg border border-slate-800 object-cover" />
            ) : (
              <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-teal-500/20 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_30%),linear-gradient(135deg,rgba(14,26,46,1),rgba(5,9,20,1))]">
                <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "linear-gradient(rgba(45,212,191,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(45,212,191,.6) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
                <div className="relative text-center">
                  <ImageIcon className="mx-auto h-7 w-7 text-teal-400/60" />
                  <p className="mt-2 text-[11px] font-bold text-slate-200">Image placeholder</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">Generate from the selected image preset.</p>
                  {selectedPreset && <p className="mt-1 text-[9px] text-slate-600">{selectedPreset.width} × {selectedPreset.height} · {selectedPreset.aspect_ratio}</p>}
                  <p className={cx("mt-1 text-[9px] font-semibold",
                    imgStatus === "Image Missing" ? "text-amber-400" : "text-slate-600"
                  )}>{imgStatus}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!imageProvider || !selectedDraft.image_prompt || isPending}
                onClick={() => {
                  const fd = new FormData();
                  fd.append("draft_id", selectedDraft.id);
                  fd.append("prompt", selectedDraft.image_prompt ?? "");
                  fd.append("width",  String(selectedPreset?.width  ?? 1200));
                  fd.append("height", String(selectedPreset?.height ?? 630));
                  fd.append("target", selectedPreset?.target ?? "blog");
                  startTransition(async () => {
                    const r = await generateImageAction(fd);
                    setMessage(r.ok ? "Image generated." : (r.error ?? "Image generation failed."));
                  });
                }}
                className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-2 py-2 text-[10px] font-semibold text-purple-200 disabled:opacity-40">
                Generate Image
              </button>
              <button type="button" disabled={!imageProvider || !selectedDraft.image_url}
                onClick={() => {
                  const fd = new FormData();
                  fd.append("draft_id", selectedDraft.id);
                  fd.append("prompt", selectedDraft.image_prompt ?? "");
                  fd.append("width",  String(selectedPreset?.width  ?? 1200));
                  fd.append("height", String(selectedPreset?.height ?? 630));
                  fd.append("target", selectedPreset?.target ?? "blog");
                  startTransition(async () => {
                    const r = await generateImageAction(fd);
                    setMessage(r.ok ? "Image regenerated." : (r.error ?? "Regeneration failed."));
                  });
                }}
                className="rounded-lg border border-slate-700 px-2 py-2 text-[10px] font-semibold text-slate-300 disabled:opacity-40">
                Regenerate
              </button>
            </div>
            <button type="button" onClick={() => setActiveTab("studio")} className="w-full rounded-lg border border-slate-700 px-2 py-2 text-[10px] text-slate-400 hover:border-slate-600 hover:text-slate-300">
              Change Preset
            </button>
            <button type="button" disabled={!selectedDraft.image_url}
              className="w-full rounded-lg border border-red-500/20 px-2 py-2 text-[10px] font-semibold text-red-300/70 disabled:opacity-40">
              Remove Image
            </button>

            {/* Image prompt */}
            <div>
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">Image Prompt</p>
              <textarea name="image_prompt" defaultValue={selectedDraft.image_prompt ?? ""} rows={4} disabled={!canEdit}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] text-slate-200 outline-none focus:border-teal-500" />
            </div>
            <button type="button" disabled className="w-full rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-2 text-[10px] text-slate-600 opacity-50">
              Generate New Prompt
            </button>
          </div>
        </Panel>

        {/* Source Data */}
        <Panel>
          <PanelTitle
            title="Source Data"
            help={<PanelHelp title="Source Data" description="Verified engine data attached to this draft. Read-only to maintain provenance." />}
            action={<span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold text-cyan-200">{sourceType(selectedDraft)}</span>}
          />
          <div className="space-y-2 p-4 text-[11px]">
            {selectedDraft.source_data ? (
              <>
                {Object.entries(selectedDraft.source_data).slice(0, 7).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-slate-800/60 pb-1.5">
                    <span className="text-slate-500">{titleCase(k)}</span>
                    <span className="max-w-[150px] truncate text-right font-semibold text-slate-300">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
                <details className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
                  <summary className="cursor-pointer text-[10px] text-cyan-400">View full source</summary>
                  <pre className="mt-2 max-h-40 overflow-auto text-[9px] text-slate-500">{JSON.stringify(selectedDraft.source_data, null, 2)}</pre>
                </details>
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[10px] text-amber-200">
                No source data attached. Draft cannot be approved without source data.
              </div>
            )}
          </div>
        </Panel>
      </div>
    );
  }

  function renderGuardrailsExport() {
    if (!selectedDraft) return null;
    const profileRequiresImage = Boolean(selectedProfile?.requires_image || selectedPreset?.required);
    const isAutonomous = mode === "autonomous";

    return (
      <div className="space-y-4 hidden 2xl:block">
        <Panel>
          <PanelTitle
            title="Guardrails Checklist"
            help={<PanelHelp title="Guardrails" description="Checks for proof claims, source data, required images, and approval rules. Hard failures block approval." />}
            action={<button type="button" onClick={() => runDraftAction(runGuardrailsAction)} className="rounded border border-teal-500/40 px-2 py-1 text-[9px] text-teal-200">Run Check</button>}
          />
          <div className="space-y-1.5 p-3">
            {selectedGuardrails?.rules.map((rule) => {
              const hardFail = !rule.passed && ["no_solution_claims","no_unsupported_claims","source_data_attached","approval_before_publish"].includes(rule.id);
              const label = (isAutonomous && rule.id === "human_review_required")
                ? "Reviewed periodically"
                : rule.label;
              const detail = (isAutonomous && rule.id === "human_review_required")
                ? "Periodic human review configured"
                : rule.detail;
              return (
                <div key={rule.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-950/50 p-2">
                  <div className="flex gap-1.5">
                    {rule.passed
                      ? <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-300" />
                      : hardFail
                        ? <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-300" />
                        : <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    }
                    <div>
                      <p className="text-[10px] font-semibold leading-snug text-slate-200">{label}</p>
                      {detail && <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">{detail}</p>}
                    </div>
                  </div>
                  <span className={cx("shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold",
                    rule.passed ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : hardFail ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  )}>
                    {rule.passed ? "Pass" : hardFail ? "Fail" : "Warn"}
                  </span>
                </div>
              );
            })}
            {profileRequiresImage && !selectedDraft.image_url && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-200">Profile requires image before approval.</p>
            )}
            {selectedGuardrails && (
              <div className={cx("flex items-center justify-between rounded-lg border p-2 text-[10px] font-bold",
                selectedGuardrails.passed
                  ? "border-green-500/30 bg-green-500/10 text-green-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              )}>
                <span>Overall Status</span>
                <span>{selectedGuardrails.passed ? "Pass" : "Warning"}</span>
              </div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="Export / Actions" help={<PanelHelp title="Export / Actions" description="Manual approval, copy, and file download. Mark published requires approved status." />} />
          <div className="space-y-1.5 p-3">
            <button type="button" disabled={isPending} onClick={() => runDraftAction(approveDraftAction)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-[10px] font-bold text-green-200 disabled:opacity-40">
              <Check className="h-3.5 w-3.5" /> Approve &amp; Publish Now
            </button>
            <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] text-slate-400 opacity-50">
              Schedule for Later
            </button>
            <button type="button" onClick={() => runDraftAction(archiveDraftAction)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold text-slate-300">
              <Archive className="h-3.5 w-3.5" /> Archive Draft
            </button>
            <button type="button" onClick={() => runDraftAction(rejectDraftAction, { review_notes: selectedDraft.review_notes ?? "" })}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-[10px] font-semibold text-red-300">
              <X className="h-3.5 w-3.5" /> Reject Draft
            </button>
            <button type="button" disabled={selectedDraft.status !== "approved"} onClick={() => runDraftAction(markPublishedAction)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 text-[10px] font-semibold text-teal-200 disabled:opacity-40">
              Mark Published / Exported
            </button>
            <button type="button" onClick={() => runDraftAction(reopenDraftAction)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-2 text-[10px] font-semibold text-amber-200">
              Reopen for Review
            </button>
            <div className="pt-2 space-y-1">
              {([
                ["Copy Markdown",    Clipboard, () => copyText(selectedMarkdown)],
                ["Copy Plain Text",  FileText,  () => copyText(selectedPlain)],
                ["Copy HTML",        Link2,     () => copyText(selectedHtml)],
                ["Download .md",     Download,  () => downloadText(`${selectedDraft.title}.md`, selectedMarkdown, "text/markdown")],
                ["Download .txt",    Download,  () => downloadText(`${selectedDraft.title}.txt`, selectedPlain, "text/plain")],
                ["Download .json",   FileJson,  () => downloadText(`${selectedDraft.title}.json`, JSON.stringify({ draft: selectedDraft }, null, 2), "application/json")],
              ] as Array<[string, ComponentType<LucideProps>, () => void]>).map(([label, Icon, fn]) => (
                <button key={label} type="button" onClick={fn}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] text-slate-300 hover:border-cyan-500/30">
                  <span className="flex items-center gap-2"><Icon className="h-3 w-3" />{label}</span>
                  <ChevronRight className="h-3 w-3 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // ── Engine State Card ───────────────────────────────────────────────────────
  function renderEngineStateCard() {
    const e = engineState;
    return (
      <Panel className="mt-auto">
        <PanelTitle title="Engine State" help={<PanelHelp title="Engine State" description="Live computation state — the same data that drives Content Radar topics." />} />
        <div className="space-y-2 p-3 text-[11px]">
          {[
            ["Current Number",    e ? fmtN(e.currentNumber ?? e.lastProcessed) : "—"],
            ["Numbers Checked",   e ? fmtN(e.totalChecked) : "—"],
            ["Longest Trajectory",e ? (e.longestSteps?.toLocaleString() ?? "—") : "—"],
            ["Highest Peak",      e ? fmtN(e.highestPeak) : "—"],
            ["Uptime",            e ? uptimeStr(e.startedAt) : "—"],
            ["Throughput",        e?.throughputPerSecond ? `${e.throughputPerSecond.toFixed(2)} n/s` : "—"],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-500">{label}</span>
              <span className="font-bold tabular-nums text-slate-200">{value}</span>
            </div>
          ))}
          <p className="pt-1 text-right text-[9px] text-slate-600">Last Updated: {fmtDate(new Date().toISOString())}</p>
        </div>
      </Panel>
    );
  }

  // ── AI Content Actions ──────────────────────────────────────────────────────
  function renderAIContentActions() {
    return (
      <Panel>
        <PanelTitle title="AI Content Actions" help={<PanelHelp title="AI Content Actions" description="Creates or updates drafts only. Disabled when no text provider is configured." />} />
        <div className="space-y-3 p-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {([
              ["Generate Blog Post",    "blog_post"],
              ["Create LinkedIn Post",  "linkedin_post"],
              ["Create X Thread",       "x_thread"],
              ["Generate Weekly Report","weekly_report"],
              ["Improve This Draft",    "improve"],
            ] as Array<[string, string]>).map(([label, type]) => (
              <button key={label} type="button"
                disabled={type === "improve" ? (!textProvider || !selectedDraft) : false}
                onClick={() => type === "improve" ? runDraftAction(improveDraftAction) : createDraft(type as ContentType)}
                className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-3 text-[11px] font-semibold text-slate-200 hover:border-teal-500/40 disabled:opacity-40">
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Summarize this record",
              "Explain significance",
              "Add educational section",
              "Add visual idea",
              "Add disclaimer",
              "Make more concise",
              "Make it more analytical",
            ].map((chip) => (
              <button key={chip} type="button" disabled={!textProvider}
                onClick={() => runDraftAction(improveDraftAction, { instruction: chip })}
                className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] text-cyan-200 hover:border-cyan-500/30 disabled:opacity-40">
                {chip}
              </button>
            ))}
          </div>
          {!textProvider && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-200">
              No text provider configured. Add an API key in <button type="button" onClick={() => setActiveTab("studio")} className="underline">AI Studio → Providers</button>.
            </p>
          )}
        </div>
      </Panel>
    );
  }

  // ── Autonomous Publishing ───────────────────────────────────────────────────
  function renderAutonomousPublishing() {
    return (
      <Panel>
        <PanelTitle
          title="Autonomous Publishing"
          help={<PanelHelp title="Autonomous Publishing" description="Controls the publishing mode. Change the mode in Settings." />}
          action={<span className={cx("flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold", mode === "emergency_hold" ? "border-amber-500/40 text-amber-300" : "border-green-500/30 text-green-300")}>
            <span className={cx("h-1.5 w-1.5 rounded-full", mode === "emergency_hold" ? "bg-amber-400" : "bg-green-400")} />
            {mode === "emergency_hold" ? "Hold" : "Active"}
          </span>}
        />
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Mode</p>
              <p className={cx("text-base font-bold", modePillClass(mode).includes("purple") ? "text-purple-200" : modePillClass(mode).includes("teal") ? "text-teal-200" : modePillClass(mode).includes("amber") ? "text-amber-200" : "text-slate-200")}>
                {modeLabel(mode)}
              </p>
            </div>
            <button type="button" onClick={() => setActiveTab("settings")}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-[10px] text-slate-400 hover:border-teal-500/30 hover:text-teal-300">
              <Settings className="inline h-3 w-3 mr-1" />Change Mode
            </button>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-500">
            {mode === "manual"         && "AI can create drafts. A human must approve before anything becomes public."}
            {mode === "semi_auto"      && "AI automatically detects topics and creates drafts. Human must approve before publishing."}
            {mode === "autonomous"     && "AI detects topics, creates drafts, runs guardrails, and publishes if all hard guardrails pass."}
            {mode === "emergency_hold" && "Publishing is paused. AI may create internal drafts and notes, but nothing can publish."}
          </p>

          <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-3">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">Disclosure Text</p>
            <p className="text-[10px] leading-relaxed text-slate-400 italic">
              {observatorySettings.disclosure_text}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  // ── Recent Activity ─────────────────────────────────────────────────────────
  function renderRecentActivity() {
    return (
      <Panel>
        <PanelTitle
          title="Recent Activity"
          help={<PanelHelp title="Recent Activity" description="Audit trail of AI Observatory actions from real database events only." />}
          action={<Link href="/admin/activity-log" className="text-[10px] text-teal-400 hover:underline">View All</Link>}
        />
        <div className="divide-y divide-slate-800/60">
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-[11px] text-slate-500">No recent activity yet.</p>
              <p className="mt-1 text-[10px] text-slate-600">Events appear here as drafts are created, approved, and published.</p>
            </div>
          ) : recentActivity.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <p className="text-[11px] text-slate-300">{activityLabel(event.event_type)}</p>
              <span className="shrink-0 text-[10px] text-slate-600">{age(event.created_at)}</span>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  function renderReviewHistory() {
    if (!selectedDraft) return null;
    return (
      <Panel>
        <PanelTitle title="Review Notes / History" help={<PanelHelp title="Review Notes" description="Review notes and status timestamps from real draft data." />} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Review Notes</span>
            <textarea name="review_notes" defaultValue={selectedDraft.review_notes ?? ""} rows={7}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-[11px] text-slate-200 outline-none focus:border-teal-500" />
          </label>
          <div className="text-[11px]">
            <p className="mb-2 font-semibold text-slate-300">History</p>
            <div className="space-y-2">
              <div className="flex justify-between gap-4"><span className="text-slate-400">Draft created</span><span className="text-slate-600">{fmtDate(selectedDraft.created_at)}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-400">Last updated</span><span className="text-slate-600">{fmtDate(selectedDraft.updated_at)}</span></div>
              {selectedDraft.approved_at && <div className="flex justify-between gap-4"><span className="text-green-300">Approved</span><span className="text-slate-600">{fmtDate(selectedDraft.approved_at)}</span></div>}
              {selectedDraft.published_at && <div className="flex justify-between gap-4"><span className="text-cyan-300">Published</span><span className="text-slate-600">{fmtDate(selectedDraft.published_at)}</span></div>}
              {!selectedDraft.approved_at && !selectedDraft.published_at && <p className="text-slate-600">No review history yet.</p>}
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  DRAFT QUEUE PANEL                                               ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderQueuePanel(compact: boolean) {
    return (
      <Panel className={compact ? "" : "min-h-[680px]"}>
        <PanelTitle
          title="Draft Queue"
          help={<PanelHelp title="Draft Queue" description="Content created but not yet approved. Nothing here is public until approved." source="ai_drafts" />}
          action={<button type="button" onClick={() => createDraft()} className="rounded-md border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-200">New Draft</button>}
        />
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {([["all","All"],["draft","Draft"],["needs_review","Needs Review"],["approved","Approved"],["published_exported","Published"],["rejected","Rejected"],["archived","Archived"]] as Array<[QueueFilter,string]>).map(([id,label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)}
                className={cx("rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                  filter === id ? "border-teal-500/50 bg-teal-500/15 text-teal-200" : "border-slate-800 text-slate-500 hover:text-slate-200"
                )}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
            <label className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-slate-600" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, type, profile…" className="w-full bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600" />
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] text-slate-300 outline-none">
              <option value="updated">Newest updated</option>
              <option value="created">Newest created</option>
              <option value="status">Status</option>
              <option value="content_type">Content type</option>
            </select>
          </div>
          {filteredDrafts.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-slate-400">No drafts yet.</p>
              <p className="mt-1 text-[11px] text-slate-600">Generate a draft from Content Radar or create one manually.</p>
            </div>
          ) : (
            <div className={cx("grid gap-2", compact && "xl:grid-cols-2")}>
              {filteredDrafts.map((draft) => {
                const profile = profileFor(draft);
                void presetFor(draft); // preset used for image display in editor
                const gr      = checkDraftGuardrails(draft);
                return (
                  <button key={draft.id} type="button"
                    onClick={() => { setSelectedDraftId(draft.id); setActiveTab("editor"); }}
                    className={cx("group rounded-lg border bg-slate-950/50 p-3 text-left transition",
                      selectedDraftId === draft.id ? "border-teal-400/70" : "border-slate-800 hover:border-slate-700"
                    )}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-[11px] font-black text-cyan-300">
                        {draft.content_type.includes("x_") ? "X" : draft.content_type.includes("linkedin") ? "in" : "CE"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-bold text-slate-100">{draft.title}</p>
                          <StatusBadge status={draft.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                          <span>{titleCase(draft.content_type)}</span>
                          <span>{profile?.name ?? "No profile"}</span>
                          <span className={gr.passed ? "text-green-300" : "text-amber-300"}>{gr.passed ? "Guardrails pass" : "Warning"}</span>
                        </div>
                        <p className="mt-0.5 text-[9px] text-slate-600">Updated {age(draft.updated_at)}</p>
                      </div>
                      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-slate-600 group-hover:text-teal-300" />
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

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  NOTES / REPORTS / PUBLISHED                                     ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderNotes() {
    return (
      <Panel>
        <PanelTitle title="AI Notes" help={<PanelHelp title="AI Notes" description="Internal observations from verified engine events. Notes can seed drafts without inventing source data." />} />
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {notes.length === 0
            ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No AI notes yet. Notes appear when the engine produces record events, near-escape candidates, or range summaries.</p>
            : notes.map((note) => (
              <div key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{note.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{titleCase(note.note_type)} · {titleCase(note.severity)} · {fmtDate(note.created_at)}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] text-slate-400">{titleCase(note.status)}</span>
                </div>
                <p className="mt-3 line-clamp-4 text-[11px] leading-relaxed text-slate-400">{note.body}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => createDraft("blog_post")} className="rounded border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[10px] text-teal-200">Convert to Draft</button>
                  {(["reviewed","archived"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => {
                      const fd = new FormData();
                      fd.append("id", note.id);
                      fd.append("status", s);
                      startTransition(async () => { const r = await updateNoteStatusAction(fd); setMessage(r.ok ? `Note ${s}.` : (r.error ?? "Failed.")); });
                    }} className="rounded border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                      {titleCase(s)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          }
        </div>
      </Panel>
    );
  }

  function renderReports() {
    const reportDrafts = drafts.filter((d) => d.content_type === "weekly_report" || d.content_type === "observatory_report");
    return (
      <Panel>
        <PanelTitle
          title="Reports"
          help={<PanelHelp title="Reports" description="Weekly and Observatory report drafts. Generation creates review drafts only." />}
          action={<button type="button" onClick={() => createDraft("weekly_report")} className="rounded border border-teal-500/40 px-2.5 py-1 text-[10px] text-teal-200">New Weekly Report</button>}
        />
        <div className="p-4">
          {reportDrafts.length === 0
            ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No report drafts yet.</p>
            : <div className="grid gap-2">{reportDrafts.map((d) => (
                <button key={d.id} type="button" onClick={() => { setSelectedDraftId(d.id); setActiveTab("editor"); }}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-teal-500/40">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-100">{d.title}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">Updated {age(d.updated_at)}</p>
                </button>
              ))}</div>
          }
        </div>
      </Panel>
    );
  }

  function renderPublished() {
    const pub = drafts.filter((d) => d.status === "approved" || d.status === "published");
    return (
      <Panel>
        <PanelTitle title="Published / Exported" help={<PanelHelp title="Published" description="Approved and published drafts eligible for manual export or public Observatory display." />} />
        <div className="p-4">
          {pub.length === 0
            ? <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">No approved or published content yet.</p>
            : <div className="grid gap-2">{pub.map((d) => (
                <button key={d.id} type="button" onClick={() => { setSelectedDraftId(d.id); setActiveTab("editor"); }}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left hover:border-teal-500/40">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-100">{d.title}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">{titleCase(d.content_type)} · {fmtDate(d.published_at ?? d.approved_at ?? d.updated_at)}</p>
                </button>
              ))}</div>
          }
        </div>
      </Panel>
    );
  }

  function renderUsage() {
    return (
      <Panel>
        <PanelTitle title="Usage / Cost" help={<PanelHelp title="Usage" description="Provider usage events appear here after generation calls are logged." />} />
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-slate-300">No usage events to display yet.</p>
          <p className="mt-2 text-[11px] text-slate-500">Generation is server-side and reports real provider usage when available.</p>
        </div>
      </Panel>
    );
  }

  // ╔══════════════════════════════════════════════════════════════════╗
  // ║  SETTINGS TAB                                                    ║
  // ╚══════════════════════════════════════════════════════════════════╝
  function renderSettings() {
    const s = observatorySettings;
    return (
      <div className="grid gap-5 xl:grid-cols-[1fr_480px]">
        <form action={async (fd) => {
          const r = await saveObservatorySettingsAction(fd);
          setMessage(r.ok ? "Settings saved." : (r.error ?? "Failed to save settings."));
        }}>
          <Panel>
            <PanelTitle
              title="Observatory Settings"
              help={<PanelHelp title="Observatory Settings" description="Controls publishing mode, disclosure text, and autonomous behavior triggers." />}
            />
            <div className="space-y-5 p-5">

              {/* Publishing Mode */}
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Publishing Mode</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([
                    ["manual",         "Manual",         "AI creates drafts only. Human approves and publishes everything."],
                    ["semi_auto",      "Semi-Auto",       "AI creates drafts automatically. Human must approve before any content is published."],
                    ["autonomous",     "Autonomous",      "AI creates drafts, runs guardrails, and publishes if all hard guardrails pass."],
                    ["emergency_hold", "Emergency Hold",  "Nothing can publish. AI may still create internal drafts and notes."],
                  ] as Array<[string, string, string]>).map(([value, label, desc]) => (
                    <label key={value} className={cx(
                      "flex cursor-pointer gap-3 rounded-xl border p-4 transition-all",
                      s.publishing_mode === value ? "border-teal-500/50 bg-teal-500/8" : "border-slate-800 hover:border-slate-700"
                    )}>
                      <input type="radio" name="publishing_mode" value={value} defaultChecked={s.publishing_mode === value} className="mt-0.5 accent-teal-400" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-200">{label}</p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Disclosure Text */}
              <div>
                <label>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Disclosure Text</p>
                  <p className="mb-2 text-[10px] text-slate-600">Included in all autonomously generated reports and public Observatory content.</p>
                  <textarea name="disclosure_text" defaultValue={s.disclosure_text} rows={3}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-[11px] leading-relaxed text-slate-200 outline-none focus:border-teal-500" />
                </label>
                <p className="mt-1 text-[9px] text-slate-600">Required exact wording for reports: &ldquo;This report was generated automatically by The Collatz Engine from verified computation data. It does not claim to prove the Collatz Conjecture.&rdquo;</p>
              </div>

              {/* Trigger Settings */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Content Triggers</p>
                <div className="space-y-2">
                  {([
                    ["auto_topic_detection_enabled",  "Auto Topic Detection",    "Content Radar scans live engine data for publishable opportunities.", s.auto_topic_detection_enabled],
                    ["weekly_report_enabled",         "Weekly Report Trigger",   "Suggests weekly report topics automatically.", s.weekly_report_enabled],
                    ["record_trigger_enabled",        "Record Event Trigger",    "Suggests posts when new trajectory or peak records are detected.", s.record_trigger_enabled],
                    ["near_escape_trigger_enabled",   "Near-Escape Trigger",     "Suggests posts when near-escape candidates are logged.", s.near_escape_trigger_enabled],
                    ["auto_draft_generation_enabled", "Auto Draft Generation",   "AI automatically generates draft body when topic is created (requires text provider).", s.auto_draft_generation_enabled],
                    ["auto_image_generation_enabled", "Auto Image Generation",   "AI automatically generates an image with each draft (requires OpenAI).", s.auto_image_generation_enabled],
                  ] as Array<[string, string, string, boolean]>).map(([name, label, desc, defaultVal]) => (
                    <label key={name} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <input type="hidden" name={name} value="false" />
                      <input type="checkbox" name={name} value="true" defaultChecked={defaultVal} className="mt-0.5 accent-teal-400" />
                      <div>
                        <p className="text-[11px] font-semibold text-slate-200">{label}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Max auto posts */}
              <div>
                <label>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Auto-Posts Per Day</p>
                  <p className="mb-2 text-[10px] text-slate-600">Only applies in Autonomous mode.</p>
                  <input type="number" name="max_auto_posts_per_day" defaultValue={s.max_auto_posts_per_day} min={0} max={10}
                    className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-teal-500" />
                </label>
              </div>

              <button type="submit" className="rounded-lg border border-teal-500/50 bg-teal-500/15 px-5 py-2.5 text-sm font-bold text-teal-100 hover:bg-teal-500/25">
                Save Settings
              </button>
            </div>
          </Panel>
        </form>

        {/* Right column: mode description + safety notes */}
        <div className="space-y-4">
          <Panel>
            <PanelTitle title="Current Mode" />
            <div className="p-5">
              <div className={cx("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-bold", modePillClass(mode))}>
                {modeLabel(mode)}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
                {mode === "manual"         && "All AI activity creates internal drafts only. Nothing appears publicly until a human explicitly approves and exports it."}
                {mode === "semi_auto"      && "The system automatically detects topics and creates drafts, but a human must review and approve every draft before it appears anywhere publicly."}
                {mode === "autonomous"     && "The system detects topics, creates drafts, runs all guardrail checks, and publishes to the public Observatory if all hard guardrails pass. Human review happens periodically after the fact."}
                {mode === "emergency_hold" && "All publishing is paused. The system may still create internal notes and drafts for future review, but nothing will appear publicly until the mode is changed."}
              </p>
            </div>
          </Panel>

          <Panel className="border-slate-700/40">
            <PanelTitle title="Publishing Safety Rules" />
            <div className="space-y-2 p-4 text-[10px] text-slate-500">
              {[
                "Guardrail failures always block publishing, even in Autonomous mode.",
                "Source data must be attached before a draft can be approved.",
                "The required disclosure text must be present in every report.",
                "No proof claims are permitted in any content.",
                "External platform posting (Ghost, LinkedIn, X) is manual export only.",
                "The public Observatory only shows approved or published drafts.",
                "Full API keys are never returned to the browser.",
                "Service-role key is server-side only and never logged.",
              ].map((rule) => (
                <div key={rule} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400/60" />
                  <p>{rule}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    );
  }
}
