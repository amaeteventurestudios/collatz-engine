const feedEvents = [
  {
    icon: "▶",
    iconColor: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/8 dark:bg-teal-400/8",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
    time: "Phase 4",
    title: "Phase 4 batch runner available",
    body: "The autonomous batch runner is ready. It can process any range of positive integers locally, detect records, flag near-escape candidates, and compute residue class statistics.",
    tag: "Engine",
    tagColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
  },
  {
    icon: "◈",
    iconColor: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/8 dark:bg-blue-400/8",
    ring: "ring-blue-500/20 dark:ring-blue-400/20",
    time: "Phase 4",
    title: "Demo batch summary generated locally (1–1,000)",
    body: "A local batch for n = 1 to 1,000 was computed by the batch runner. No data was written to Supabase. This is local-only demo data. Autonomous cataloging begins in Phase 5/6.",
    tag: "Batch",
    tagColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  {
    icon: "◈",
    iconColor: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/8 dark:bg-teal-400/8",
    ring: "ring-teal-500/20 dark:ring-teal-400/20",
    time: "Phase 2",
    title: "Phase 2 dashboard shell initialized",
    body: "The public homepage shell and admin interface have been scaffolded. Engine connection and live data are planned for Phase 3.",
    tag: "System",
    tagColor: "bg-slate-200/80 text-slate-600 dark:bg-slate-700/80 dark:text-slate-300",
  },
  {
    icon: "⏳",
    iconColor: "text-yellow-500 dark:text-yellow-400",
    bg: "bg-yellow-500/8 dark:bg-yellow-400/8",
    ring: "ring-yellow-500/20 dark:ring-yellow-400/20",
    time: "Pending",
    title: "Awaiting live Collatz engine connection",
    body: "The autonomous computation worker that catalogs trajectories persistently has not yet been connected. Live records will appear once the worker is online in Phase 5/6.",
    tag: "Engine",
    tagColor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  {
    icon: "✦",
    iconColor: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/8 dark:bg-violet-400/8",
    ring: "ring-violet-500/20 dark:ring-violet-400/20",
    time: "Pending",
    title: "AI review workflow pending",
    body: "The AI-assisted observation pipeline is configured but idle. Observations are generated only when trajectory data is present and remain private until admin-approved.",
    tag: "AI",
    tagColor: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  },
  {
    icon: "○",
    iconColor: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    ring: "ring-slate-200/60 dark:ring-slate-700/40",
    time: "—",
    title: "No public observations submitted yet",
    body: "No AI-drafted observations have been approved for public display. This feed will show approved research notes once the engine begins processing.",
    tag: "Research Log",
    tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  },
  {
    icon: "○",
    iconColor: "text-slate-400 dark:text-slate-500",
    bg: "bg-slate-100/60 dark:bg-slate-800/40",
    ring: "ring-slate-200/60 dark:ring-slate-700/40",
    time: "—",
    title: "No dataset records catalogued yet",
    body: "Record-breaking trajectories (longest path, highest peak, etc.) will appear here as the engine catalogs new numbers.",
    tag: "Records",
    tagColor: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  },
];

export function DiscoveryFeed() {
  return (
    <section id="feed" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div>
              <p className="section-heading">Discovery Feed</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Milestones, records, and approved research notes — in order
              </p>
            </div>
            <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* Feed list */}
          <div className="space-y-3">
            {feedEvents.map((event) => (
              <div
                key={event.title}
                className={`flex gap-3.5 rounded-xl border p-4 ring-1 ${event.bg} ${event.ring}`}
                style={{ borderColor: "transparent" }}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  <span className={`text-lg leading-none ${event.iconColor}`}>{event.icon}</span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.tagColor}`}
                    >
                      {event.tag}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {event.time}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {event.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Feed updates automatically as the engine catalogs trajectories and observations are
            approved. No live data yet.
          </p>
        </div>
      </div>
    </section>
  );
}
