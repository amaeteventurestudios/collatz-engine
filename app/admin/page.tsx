import { AdminCard } from "@/components/admin/AdminCard";

const cards = [
  {
    icon: "✦",
    title: "Observations for Review",
    description:
      "Review and approve AI-generated observations before they appear on the public Research Log. Human review required before any public release.",
    badge: "0 pending",
    badgeColor: "blue" as const,
  },
  {
    icon: "▲",
    title: "Records Manager",
    description:
      "View, verify, and annotate all-time records. Flag disputed records for human review before publishing.",
    badge: "No records yet",
    badgeColor: "slate" as const,
  },
  {
    icon: "⚑",
    title: "Near-Escape Manager",
    description:
      "Inspect near-escape candidates flagged by the engine. Set severity thresholds and review criteria.",
    badge: "No candidates",
    badgeColor: "slate" as const,
  },
  {
    icon: "✉",
    title: "Submission Inbox",
    description:
      "Review observations and ideas submitted by the public. Mark as reviewed, published, or archived.",
    badge: "0 unread",
    badgeColor: "green" as const,
  },
  {
    icon: "◈",
    title: "Site Settings",
    description:
      "Configure public-facing display options, maintenance mode, footer content, and feature flags.",
    badge: "Phase 5+",
    badgeColor: "yellow" as const,
  },
  {
    icon: "≡",
    title: "Audit Log",
    description:
      "Full activity log of all admin actions, engine events, and system state changes with timestamps.",
    badge: "0 entries",
    badgeColor: "slate" as const,
  },
];

const engineTimingStats = [
  { label: "Engine Status", value: "Offline", valueClass: "text-slate-500 dark:text-slate-400" },
  { label: "Started At", value: "—", valueClass: "text-slate-900 dark:text-slate-100" },
  { label: "Runtime", value: "—", valueClass: "text-slate-900 dark:text-slate-100" },
  { label: "Last Batch", value: "—", valueClass: "text-slate-900 dark:text-slate-100" },
  { label: "Next Batch Start", value: "—", valueClass: "text-slate-900 dark:text-slate-100" },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage the Collatz Engine, review AI notes, and configure public-facing settings.
        </p>
      </div>

      {/* Engine Controls panel */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 sm:mb-8">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-200 text-sm dark:bg-slate-800">
              ⚙
            </span>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Engine Controls</p>
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/80 dark:text-slate-400">
              Offline
            </span>
          </div>
          <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">
            Controls available in Phase 5/6/10
          </span>
        </div>

        {/* Timing stats grid */}
        <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-5">
          {engineTimingStats.map((s) => (
            <div
              key={s.label}
              className="bg-white px-4 py-3.5 text-center dark:bg-slate-950"
            >
              <p className="stat-label">{s.label}</p>
              <p className={`mt-1.5 text-sm font-bold tabular-nums ${s.valueClass}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Control buttons — disabled placeholders */}
        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-200 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/30">
          <p className="mr-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Controls:
          </p>
          {[
            { label: "Start Engine", color: "bg-teal-500/10 text-teal-700 dark:text-teal-400 ring-teal-500/20" },
            { label: "Pause Engine", color: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ring-yellow-500/20" },
            { label: "Resume Engine", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20" },
          ].map((btn) => (
            <button
              key={btn.label}
              disabled
              title="Coming in Phase 5/6/10"
              className={`cursor-not-allowed rounded-lg px-4 py-2 text-xs font-semibold opacity-50 ring-1 ${btn.color}`}
            >
              {btn.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
            Start/pause/resume available when persistent cataloging is connected in Phase 5/6/10
          </span>
        </div>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:grid-cols-4">
        {[
          { label: "Engine Status", value: "Offline", valueClass: "text-slate-500" },
          {
            label: "Trajectories Catalogued",
            value: "—",
            valueClass: "text-slate-900 dark:text-slate-100",
          },
          {
            label: "AI Notes Pending",
            value: "0",
            valueClass: "text-slate-900 dark:text-slate-100",
          },
          {
            label: "Submissions",
            value: "0",
            valueClass: "text-slate-900 dark:text-slate-100",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="stat-label">{s.label}</p>
            <p className={`mt-1.5 text-xl font-bold tabular-nums ${s.valueClass}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <AdminCard key={card.title} {...card} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        Engine controls, auth, and full admin functionality arrive in Phase 5/6/10. All controls
        shown are placeholders.
      </p>
    </div>
  );
}
