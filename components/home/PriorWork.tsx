const focusAreas = [
  {
    icon: "◈",
    color: "text-teal-500 dark:text-teal-400",
    title: "Public visualization",
    body: "The primary goal is a visually accessible interface for exploring Collatz trajectories, browsable by starting number, sortable by metric, and readable without a mathematics background.",
  },
  {
    icon: "▤",
    color: "text-blue-500 dark:text-blue-400",
    title: "Trajectory cataloging",
    body: "The engine systematically computes and stores per-trajectory statistics for a defined range, making the data queryable and comparable in ways a one-off script does not.",
  },
  {
    icon: "≡",
    color: "text-violet-500 dark:text-violet-400",
    title: "Pattern exploration",
    body: "Heatmaps, distribution charts, and record leaderboards surface statistical structure across large ranges. These patterns are visible only in aggregate.",
  },
  {
    icon: "✦",
    color: "text-orange-500 dark:text-orange-400",
    title: "Human-reviewed AI observations",
    body: "AI-assisted analysis generates private draft notes that require admin approval before publication. This creates a reviewed, citable layer of statistical commentary without making proof claims.",
  },
];

const priorProjects = [
  {
    name: "Oliveira e Silva verification",
    scope: "Verified all n up to 2⁶⁸ (≈ 2.95 × 10²⁰)",
    note: "The most extensive verified range as of this writing. This engine does not approach that scale.",
    url: null,
  },
  {
    name: "BOINC / distributed computing efforts",
    scope: "Crowd-sourced verification across volunteer computers",
    note: "This engine runs on a single server; it is not a distributed effort.",
    url: null,
  },
  {
    name: "OEIS sequence A006577",
    scope: "Step-count sequence for all positive integers, catalogued in the OEIS",
    note: "A definitive reference for step counts; this engine independently computes the same values as verification.",
    url: null,
  },
  {
    name: "Lagarias (2010) annotated bibliography",
    scope: "Comprehensive survey of Collatz-related literature",
    note: "The authoritative academic reference for the conjecture's history and open problems.",
    url: null,
  },
];

export function PriorWork() {
  return (
    <section id="prior-work" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
            Prior Work &amp; Related Projects
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            This engine is not the largest or fastest verification effort. Here is what it is
          </p>
        </div>

        {/* Clarification notice */}
        <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-4 dark:border-blue-400/20 dark:bg-blue-400/5">
          <span className="mt-0.5 shrink-0 text-sm text-blue-500 dark:text-blue-400">ℹ</span>
          <div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Scope clarification
            </p>
            <p className="mt-1 text-xs leading-relaxed text-blue-600/80 dark:text-blue-300/70">
              Extensive Collatz verification efforts exist. The verified range already exceeds 2⁶⁸.
              This engine is not attempting to surpass those records. Its purpose is public
              visualization, systematic cataloging of trajectory statistics, and human-reviewed AI
              observations over a tractable range.
            </p>
          </div>
        </div>

        {/* What this engine focuses on */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {focusAreas.map((area) => (
            <div
              key={area.title}
              className="engine-card-sm flex flex-col gap-2"
            >
              <span className={`text-lg leading-none ${area.color}`}>{area.icon}</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{area.title}</p>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {area.body}
              </p>
            </div>
          ))}
        </div>

        {/* Prior projects table */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Notable prior &amp; related efforts
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            {priorProjects.map((proj, i) => (
              <div
                key={proj.name}
                className={`grid gap-1 px-4 py-3.5 sm:grid-cols-3 sm:gap-3 ${
                  i !== priorProjects.length - 1
                    ? "border-b border-slate-200 dark:border-slate-800"
                    : ""
                }`}
              >
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {proj.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {proj.scope}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:col-span-2">
                  {proj.note}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
