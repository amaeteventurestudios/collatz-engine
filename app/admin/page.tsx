import { AdminCard } from "@/components/admin/AdminCard";

const cards = [
  {
    icon: "⚙",
    title: "Engine Controls",
    description:
      "Start, pause, or configure the computation engine. Set batch size, range limits, and processing intervals.",
    badge: "Offline",
    badgeColor: "slate" as const,
  },
  {
    icon: "✦",
    title: "AI Notes Review",
    description:
      "Review and approve AI-generated observations before they appear on the public Research Log.",
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
    badge: "Phase 1",
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

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage the Collatz Engine, review AI notes, and configure public-facing settings.
        </p>
      </div>

      {/* Summary strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Engine Status", value: "Offline", color: "text-slate-500" },
          { label: "Trajectories", value: "—", color: "text-slate-900 dark:text-slate-100" },
          { label: "AI Notes Pending", value: "0", color: "text-slate-900 dark:text-slate-100" },
          { label: "Submissions", value: "0", color: "text-slate-900 dark:text-slate-100" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="stat-label">{s.label}</p>
            <p className={`mt-1 text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <AdminCard key={card.title} {...card} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        Full admin functionality arrives in Phase 2. All controls are placeholders in Phase 1.
      </p>
    </div>
  );
}
