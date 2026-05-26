const logTabs = ["Latest Note", "Batch Analysis", "Pattern Report", "Deep Report", "Hypotheses", "Weekly Digest"];

const placeholderNotes = [
  {
    tag: "Batch Analysis",
    time: "Pending",
    title: "Awaiting first batch",
    body: "AI-assisted observations will appear here once the computation engine begins processing trajectories. Notes are generated after each batch completes.",
  },
  {
    tag: "Pattern Report",
    time: "Pending",
    title: "No patterns detected yet",
    body: "Statistical pattern analysis will begin when sufficient trajectory data is available.",
  },
];

export function AIResearchLog() {
  return (
    <section id="research" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✦</span>
              <p className="section-heading">AI Research Log</p>
            </div>
            <button className="text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
              View all
            </button>
          </div>

          {/* Tabs */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {logTabs.map((tab, i) => (
              <button
                key={tab}
                className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  i === 0
                    ? "bg-teal-500/20 text-teal-600 ring-1 ring-teal-500/30 dark:text-teal-400"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-4">
            {placeholderNotes.map((note) => (
              <div
                key={note.title}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                    {note.tag}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{note.time}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {note.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {note.body}
                </p>
              </div>
            ))}
          </div>

          {/* AI confidence bar */}
          <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">AI Confidence</span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-1.5 w-0 rounded-full bg-teal-500 transition-all duration-500" />
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Pending</span>
          </div>
        </div>
      </div>
    </section>
  );
}
