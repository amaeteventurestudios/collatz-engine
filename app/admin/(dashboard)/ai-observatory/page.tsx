import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import {
  getAIObservatoryStats,
  getRecentAINotes,
  getRecentDrafts,
  getAIProviders,
  getModelSettings,
  getBrandVoiceProfiles,
  getPromptTemplates,
  getImagePresets,
  getPublishingProfiles,
} from "@/lib/ai-observatory/admin-store";
import { SYSTEM_GUARDRAILS } from "@/lib/ai-observatory/guardrails";
import { isEncryptionConfigured } from "@/lib/ai-observatory/encryption";
import { PROVIDER_CAPABILITIES } from "@/lib/ai-observatory/types";
import { DEFAULT_BRAND_VOICE } from "@/lib/ai-observatory/types";
import { getEngineAdminState } from "@/lib/admin/metrics";
import { getWorkerLockState } from "@/lib/admin/metrics";
import { AIStudioClient } from "./AIStudioClient";

export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeading({ id, children, help }: {
  id?: string; children: React.ReactNode; help?: React.ReactNode;
}) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-teal-500">
      <span className="h-px flex-1 bg-slate-800" />
      <span className="flex shrink-0 items-center gap-1.5">{children}{help}</span>
      <span className="h-px flex-1 bg-slate-800" />
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>{children}</div>;
}

function StatCard({
  label, value, sub, accent, icon,
}: { label: string; value: string; sub?: string; accent: string; icon: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <span className="text-base leading-none text-slate-600">{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-black tabular-nums leading-none ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] text-slate-600">{sub}</p>}
    </div>
  );
}

function NoteTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    record:       "bg-violet-500/15 text-violet-400 border-violet-500/20",
    near_escape:  "bg-orange-500/15 text-orange-400 border-orange-500/20",
    milestone:    "bg-teal-500/15 text-teal-400 border-teal-500/20",
    range_summary:"bg-blue-500/15 text-blue-400 border-blue-500/20",
    anomaly:      "bg-red-500/15 text-red-400 border-red-500/20",
    pattern:      "bg-purple-500/15 text-purple-400 border-purple-500/20",
    system:       "bg-slate-700/50 text-slate-400 border-slate-700",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${colors[type] ?? colors.system}`}>
      {type.replace("_", " ")}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    info:       "bg-slate-500",
    interesting:"bg-blue-400",
    important:  "bg-yellow-400",
    critical:   "bg-red-400",
  };
  return <span className={`h-2 w-2 shrink-0 rounded-full ${colors[severity] ?? colors.info}`} />;
}

function DraftStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft:          "bg-slate-700/50 text-slate-400 border-slate-700",
    needs_review:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    approved:       "bg-green-500/15 text-green-400 border-green-500/20",
    published:      "bg-teal-500/15 text-teal-400 border-teal-500/20",
    rejected:       "bg-red-500/15 text-red-400 border-red-500/20",
    archived:       "bg-slate-800 text-slate-500 border-slate-700",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${styles[status] ?? styles.draft}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function ContentTypeBadge({ type }: { type: string }) {
  return (
    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-slate-400">
      {type.replace(/_/g, " ")}
    </span>
  );
}

function fmtAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AIObservatoryPage() {
  const [
    stats,
    recentNotes,
    needsReviewDrafts,
    recentPublished,
    providers,
    modelSettings,
    brandVoices,
    templates,
    imagePresets,
    publishingProfiles,
    engineResult,
    workerLockResult,
  ] = await Promise.all([
    getAIObservatoryStats(),
    getRecentAINotes(6),
    getRecentDrafts(6, ["needs_review", "draft"]),
    getRecentDrafts(4, ["approved", "published"]),
    getAIProviders(),
    getModelSettings(),
    getBrandVoiceProfiles(),
    getPromptTemplates(),
    getImagePresets(),
    getPublishingProfiles(),
    getEngineAdminState(),
    getWorkerLockState(),
  ]);

  const engine = engineResult.data;
  const workerLock = workerLockResult.data;
  const encryptionReady = isEncryptionConfigured();
  const hasConfiguredProvider = providers.some((p) => p.enabled && p.api_key_masked);

  const GUARDRAIL_DISPLAY = SYSTEM_GUARDRAILS.map((g) => ({
    ...g,
    // Enforcement levels: enforced=always active, configured=enabled by settings, planned=future
    badgeClass:
      g.enforcement === "enforced"
        ? "bg-green-500/15 text-green-400 border-green-500/20"
        : g.enforcement === "configured"
          ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
          : "bg-slate-700/50 text-slate-500 border-slate-700",
  }));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">AI Observatory</h1>
            <PanelHelp
              title="AI Observatory"
              description="Admin control center for AI-assisted notes, drafts, images, and reports from verified Collatz Engine data."
              details="Nothing auto-publishes. Every piece of content requires explicit human approval before it can appear on the public Observatory."
              operatorNote="All content is derived from verified engine data only. No fake discoveries or proof claims."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">AI-assisted insights, drafts, and reports from verified Collatz Engine data</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Engine Status */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Engine Status</span>
            <span className={`text-[10px] font-semibold ${engine?.status === "running" ? "text-green-400" : "text-slate-400"}`}>
              {engine?.status === "running" ? "Running" : engine?.status ?? "Unknown"}
            </span>
            {engine?.status === "running" && <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />}
          </div>
          {/* Worker Lock */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">Worker Lock</span>
            <span className={`text-[10px] font-semibold ${workerLock?.status === "active" ? "text-green-400" : "text-slate-400"}`}>
              {workerLock?.status === "active" ? "Active" : workerLock?.status ?? "—"}
            </span>
          </div>
          <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
            ← Overview
          </Link>
          <Link
            href="/observatory"
            className="flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-950/20 px-3 py-1.5 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
          >
            Visit Site ↗
          </Link>
        </div>
      </div>

      {/* ── Migration notice if tables missing ──────────────────────────────── */}
      {stats.notesCount === 0 && stats.draftsCount === 0 && (
        <div className="rounded-xl border border-yellow-900/30 bg-yellow-950/10 px-5 py-4">
          <p className="text-[11px] font-semibold text-yellow-400">Database tables not yet created</p>
          <p className="mt-1 text-[11px] text-yellow-400/60">
            Run <span className="font-mono text-yellow-300">supabase/phase-3a-ai-observatory.sql</span> in the Supabase SQL Editor to create all AI Observatory tables.
            Until then, all counts show zero and settings cannot be saved.
          </p>
        </div>
      )}

      {/* ── Encryption notice ───────────────────────────────────────────────── */}
      {!encryptionReady && (
        <div className="rounded-xl border border-orange-900/30 bg-orange-950/10 px-5 py-4">
          <p className="text-[11px] font-semibold text-orange-400">API key encryption not configured</p>
          <p className="mt-1 text-[11px] text-orange-400/60">
            Set <span className="font-mono text-orange-300">AI_SETTINGS_ENCRYPTION_KEY</span> (64-char hex string) to enable secure API key storage.
            Provider keys cannot be saved until this is set.
          </p>
        </div>
      )}

      {/* ── Split layout: main + public sidebar ─────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">

        {/* ── LEFT: Main dashboard ─────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <StatCard label="AI Notes" value={stats.notesCount.toString()} sub="Total generated" accent="text-teal-400" icon="◈" />
            <StatCard label="Drafts" value={stats.draftsCount.toString()} sub={stats.needsReviewCount > 0 ? `${stats.needsReviewCount} needs review` : "In pipeline"} accent="text-blue-400" icon="◎" />
            <StatCard label="Approved" value={stats.approvedCount.toString()} sub="Ready to publish" accent="text-green-400" icon="✓" />
            <StatCard label="Published" value={stats.publishedCount.toString()} sub="Live or exported" accent="text-violet-400" icon="◉" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
            <StatCard label="Reports Generated" value={stats.reportsGenerated.toString()} sub="Total reports" accent="text-amber-400" icon="▤" />
            <StatCard label="Images Generated" value={stats.imagesGenerated.toString()} sub="Total images" accent="text-pink-400" icon="◧" />
            <StatCard label="Needs Review" value={stats.needsReviewCount.toString()} sub="Awaiting approval" accent={stats.needsReviewCount > 0 ? "text-yellow-400" : "text-slate-500"} icon="⚑" />
            <StatCard label="Archived / Rejected" value={stats.rejectedCount.toString()} sub="" accent="text-slate-500" icon="◌" />
          </div>

          {/* Recent AI Notes + Drafts Needing Review */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Recent AI Notes */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Recent AI Notes</span>
                  <PanelHelp
                    title="AI Notes"
                    description="Observations generated from verified engine events. Notes are the raw material that gets expanded into drafts."
                    source="ai_notes table."
                  />
                </div>
                <span className="text-[10px] text-teal-400 cursor-pointer hover:underline">View all</span>
              </div>
              <div className="space-y-2">
                {recentNotes.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                    <p className="text-[11px] text-slate-500">AI notes will appear here when engine events are summarized.</p>
                  </div>
                ) : (
                  recentNotes.map((note) => (
                    <div key={note.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700 transition-colors">
                      <SeverityDot severity={note.severity} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[11px] font-semibold text-slate-200 truncate">{note.title}</p>
                          <NoteTypeBadge type={note.note_type} />
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-600">{fmtAge(note.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Drafts Needing Review */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Drafts Needing Review</span>
                  <PanelHelp
                    title="Drafts Needing Review"
                    description="Drafts in 'needs_review' or 'draft' status. These require human review before they can be approved for publishing."
                    operatorNote="Only approved drafts can appear on the public Observatory."
                  />
                </div>
                <span className="text-[10px] text-teal-400 cursor-pointer hover:underline">View all</span>
              </div>
              <div className="space-y-2">
                {needsReviewDrafts.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                    <p className="text-[11px] text-slate-500">No drafts awaiting review.</p>
                  </div>
                ) : (
                  needsReviewDrafts.map((draft) => (
                    <div key={draft.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-slate-700 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-[11px] font-semibold text-slate-200 truncate">{draft.title}</p>
                          <DraftStatusBadge status={draft.status} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ContentTypeBadge type={draft.content_type} />
                          <span className="text-[10px] text-slate-600">{fmtAge(draft.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Publishing Pipeline + Recently Published */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Publishing Pipeline */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Publishing Pipeline</span>
                <PanelHelp
                  title="Publishing Pipeline"
                  description="Status breakdown of all drafts — from raw draft through review, approval, and publishing."
                />
              </div>
              <Card className="!py-4">
                <div className="space-y-2">
                  {[
                    { label: "Draft",             value: stats.draftsCount - stats.needsReviewCount,          color: "bg-slate-600",   textColor: "text-slate-400" },
                    { label: "Needs Review",       value: stats.needsReviewCount,                              color: "bg-yellow-500",  textColor: "text-yellow-400" },
                    { label: "Approved",           value: stats.approvedCount,                                 color: "bg-green-500",   textColor: "text-green-400" },
                    { label: "Published / Exported",value: stats.publishedCount,                              color: "bg-teal-500",    textColor: "text-teal-400" },
                    { label: "Archived / Rejected", value: stats.rejectedCount,                               color: "bg-slate-700",   textColor: "text-slate-600" },
                  ].map((row) => {
                    const total = Math.max(stats.draftsCount, 1);
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <div className="w-28 shrink-0 text-[10px] text-slate-500">{row.label}</div>
                        <div className="flex flex-1 items-center gap-2">
                          <div className="h-1.5 flex-1 rounded-full bg-slate-800">
                            <div className={`h-1.5 rounded-full ${row.color}`} style={{ width: `${Math.min((row.value / total) * 100, 100)}%` }} />
                          </div>
                          <span className={`w-6 shrink-0 text-right text-[10px] font-bold tabular-nums ${row.textColor}`}>{row.value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Recently Published */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Recently Published / Exported</span>
                <PanelHelp
                  title="Recently Published"
                  description="Drafts that have been approved and published or exported. These may appear on the public Observatory."
                />
              </div>
              <div className="space-y-2">
                {recentPublished.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-8 text-center">
                    <p className="text-[11px] text-slate-500">No published or exported content yet.</p>
                  </div>
                ) : (
                  recentPublished.map((draft) => (
                    <div key={draft.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-[11px] font-semibold text-slate-200 truncate">{draft.title}</p>
                          <DraftStatusBadge status={draft.status} />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ContentTypeBadge type={draft.content_type} />
                          <span className="text-[10px] text-slate-600">
                            {draft.published_at ? fmtAge(draft.published_at) : fmtAge(draft.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Guardrails + Quick Actions */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Guardrails */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Guardrails Status</span>
                  <PanelHelp
                    title="Guardrails Status"
                    description="Publishing safety rules that prevent false claims, require human approval, and enforce verified-data-only policies."
                    details="Enforced = always active in code. Configured = controlled by settings. Manual = operator responsibility. Planned = future."
                  />
                </div>
                <span className="rounded-full border border-green-700 bg-green-950/20 px-2 py-0.5 text-[9px] font-bold text-green-400">All Good</span>
              </div>
              <Card className="!py-3">
                <div className="space-y-2">
                  {GUARDRAIL_DISPLAY.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs">✓</span>
                        <span className="text-[11px] text-slate-300">{g.label}</span>
                      </div>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${g.badgeClass}`}>
                        {g.enforcement}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Quick Actions</span>
              </div>
              <div className="space-y-2">
                {[
                  { label: "+ New AI Note",           href: "#drafts",      primary: true,  disabled: false },
                  { label: "Generate Weekly Report",   href: "#generate",   primary: false, disabled: !hasConfiguredProvider },
                  { label: "Open Draft Queue",         href: "#drafts",     primary: false, disabled: false },
                  { label: "Open AI Studio",           href: "#ai-studio",  primary: false, disabled: false },
                  { label: "Export Approved",          href: "#export",     primary: false, disabled: stats.approvedCount === 0 },
                ].map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-[11px] font-semibold transition-all ${
                      action.disabled
                        ? "cursor-not-allowed border-slate-800 text-slate-600"
                        : action.primary
                          ? "border-teal-700 bg-teal-950/20 text-teal-300 hover:bg-teal-950"
                          : "border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                    }`}
                  >
                    {action.label}
                    {action.disabled && (
                      <span className="ml-auto text-[9px] text-slate-700">
                        {!hasConfiguredProvider && action.label.includes("Generate") ? "Provider not configured" : "—"}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Workflow diagram */}
          <section>
            <SectionHeading id="workflow">
              The Workflow
              <PanelHelp title="Content Workflow" description="Engine data flows through AI analysis, draft queue, human review, then publish/export. Nothing auto-publishes." />
            </SectionHeading>
            <Card>
              <p className="mb-4 text-[10px] text-slate-600">From engine data to published insights</p>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { icon: "◈", label: "ENGINE DATA",   sub: "Verified computation and events",     color: "text-teal-400"   },
                  { icon: "→", label: "",               sub: "",                                    color: "text-slate-700"  },
                  { icon: "◎", label: "AI ANALYSIS",   sub: "AI generates notes and drafts",       color: "text-blue-400"   },
                  { icon: "→", label: "",               sub: "",                                    color: "text-slate-700"  },
                  { icon: "▤", label: "DRAFT QUEUE",   sub: "Drafts await human review",           color: "text-purple-400" },
                  { icon: "→", label: "",               sub: "",                                    color: "text-slate-700"  },
                  { icon: "✓", label: "HUMAN REVIEW",  sub: "Approve, edit, or request changes",   color: "text-yellow-400" },
                  { icon: "→", label: "",               sub: "",                                    color: "text-slate-700"  },
                  { icon: "◉", label: "PUBLISH / EXPORT", sub: "Publish to site, Ghost, or social", color: "text-green-400" },
                ].map((step, i) => (
                  step.label ? (
                    <div key={i} className="flex min-w-[80px] flex-col items-center gap-1 text-center">
                      <span className={`text-xl ${step.color}`}>{step.icon}</span>
                      <p className={`text-[9px] font-bold uppercase tracking-wide ${step.color}`}>{step.label}</p>
                      <p className="text-[9px] leading-snug text-slate-600">{step.sub}</p>
                    </div>
                  ) : (
                    <span key={i} className="text-slate-700 text-lg">{step.icon}</span>
                  )
                ))}
              </div>
            </Card>
          </section>

          {/* Example Outputs */}
          <section>
            <SectionHeading id="examples">
              Example Outputs
              <PanelHelp title="Example Outputs" description="AI generates multiple content formats from a single engine event." />
            </SectionHeading>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Blog Post",     icon: "▤", sub: "New Record:\n7,753,801 Steps", color: "border-teal-800 text-teal-400" },
                { label: "LinkedIn Post", icon: "in", sub: "Just now: The Collatz\nEngine reached a new…", color: "border-blue-800 text-blue-400" },
                { label: "X Thread",      icon: "𝕏", sub: "1/ New record\nin the Collatz Engine...", color: "border-slate-700 text-slate-400" },
                { label: "Weekly Report", icon: "▤", sub: "Weekly Report\nMay 12–18, 2025", color: "border-violet-800 text-violet-400" },
              ].map((ex) => (
                <div key={ex.label} className={`rounded-xl border bg-slate-900/50 p-4 ${ex.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-bold ${ex.color.split(" ")[1]}`}>{ex.icon}</span>
                    <p className={`text-[11px] font-semibold ${ex.color.split(" ")[1]}`}>{ex.label}</p>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500 whitespace-pre-line">{ex.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Publishing Targets */}
          <section>
            <SectionHeading id="targets">
              Publishing Targets
              <PanelHelp title="Publishing Targets" description="Manual or automated export destinations. Direct posting to social platforms is manual export in this phase." />
            </SectionHeading>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { icon: "◈", label: "Website",       sub: "Public Observatory",   color: "text-teal-400" },
                { icon: "G", label: "Ghost / AMAETE", sub: "Blog Publishing",      color: "text-orange-400" },
                { icon: "in", label: "LinkedIn",      sub: "Social Publishing",   color: "text-blue-400" },
                { icon: "𝕏", label: "X (Twitter)",    sub: "Social Publishing",   color: "text-slate-300" },
                { icon: "↓", label: "Export Files",   sub: "Markdown, PDF, CSV",  color: "text-green-400" },
              ].map((t) => (
                <div key={t.label} className="flex flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 py-4 px-3 text-center">
                  <span className={`text-xl ${t.color}`}>{t.icon}</span>
                  <p className={`text-[11px] font-semibold ${t.color}`}>{t.label}</p>
                  <p className="text-[9px] text-slate-600">{t.sub}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Publishing Guardrails footer bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="text-slate-600">🛡</span>
                <span className="font-bold uppercase tracking-wider text-slate-500">Publishing Guardrails</span>
                <span className="text-slate-700">Always enforced</span>
              </div>
              {[
                { label: "No Solution Claims",  sub: "We do not claim the conjecture is solved." },
                { label: "Verified Data Only",  sub: "All content is based on verified engine data." },
                { label: "Human Approval",       sub: "Nothing is published without human review." },
                { label: "Clear Disclaimers",    sub: "All outputs include appropriate disclaimers." },
                { label: "Transparency",         sub: "Sources, stats, and context are always included." },
                { label: "Audit Trail",          sub: "All actions are logged and traceable." },
              ].map((g) => (
                <div key={g.label} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-green-400 text-xs shrink-0">✓</span>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-300">{g.label}</p>
                    <p className="text-[9px] leading-snug text-slate-600">{g.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI Studio (client-side interactive) ─────────────────────────── */}
          <section id="ai-studio">
            <SectionHeading id="studio-heading">
              AI Studio
              <PanelHelp
                title="AI Studio"
                description="Configure providers, models, writing voice, prompt templates, image presets, publishing profiles, guardrails, and usage."
                operatorNote="API keys are stored encrypted. They are never shown in full after saving."
              />
            </SectionHeading>
            <AIStudioClient
              providers={providers}
              modelSettings={modelSettings}
              brandVoices={brandVoices}
              templates={templates}
              imagePresets={imagePresets}
              publishingProfiles={publishingProfiles}
              encryptionReady={encryptionReady}
              defaultBrandVoice={DEFAULT_BRAND_VOICE}
              providerCapabilities={PROVIDER_CAPABILITIES}
            />
          </section>

        </div>

        {/* ── RIGHT: Public Observatory preview ───────────────────────────── */}
        <div className="space-y-6">

          {/* Public Observatory card */}
          <div className="sticky top-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">Public Observatory</span>
              <Link href="/observatory" className="text-[10px] text-teal-400 hover:underline">
                Visit Site ↗
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
              {/* Mini hero */}
              <div className="relative h-36 overflow-hidden bg-slate-950">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-950/40 via-slate-950 to-slate-900" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                  <p className="text-[11px] font-semibold leading-snug text-slate-200">
                    A public autonomous system exploring one of mathematics&apos; most famous unsolved problems.
                  </p>
                </div>
              </div>

              {/* Engine stats */}
              <div className="grid grid-cols-2 gap-px border-t border-slate-800 bg-slate-800">
                {[
                  { label: "Numbers Checked",  value: engine?.totalChecked?.toLocaleString("en-US") ?? "—" },
                  { label: "Longest Trajectory", value: engine?.longestSteps?.toLocaleString("en-US") ?? "—" },
                  { label: "Highest Peak",      value: engine?.highestPeak != null ? `${(engine.highestPeak / 1e9).toFixed(1)}B` : "—" },
                  { label: "Engine Status",     value: engine?.status ?? "—" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-slate-900 px-3 py-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-slate-600">{stat.label}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-200 tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Latest report link */}
              <div className="border-t border-slate-800 p-4">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">Latest Report</p>
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[11px] font-semibold text-slate-300">
                    {stats.publishedCount > 0 ? "Latest approved report" : "No reports published yet"}
                  </p>
                  {stats.publishedCount === 0 && (
                    <p className="mt-1 text-[10px] text-slate-600">Approve a draft to publish your first report.</p>
                  )}
                  <Link href="/observatory" className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-teal-400 hover:underline">
                    Read Report →
                  </Link>
                </div>
              </div>

              {/* Recent Insights */}
              <div className="border-t border-slate-800 p-4">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">Recent Insights</p>
                {recentPublished.length === 0 ? (
                  <p className="text-[10px] text-slate-600">No published insights yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentPublished.slice(0, 4).map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-[10px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500/60" />
                        <span className="truncate text-slate-400">{d.title}</span>
                        <ContentTypeBadge type={d.content_type} />
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/observatory" className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-800 py-2 text-[10px] font-medium text-slate-400 hover:border-teal-800 hover:text-teal-400 transition-colors">
                  View All Reports & Insights
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
