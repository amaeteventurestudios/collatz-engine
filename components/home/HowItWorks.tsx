const steps = [
  {
    label: "01",
    title: "Sequential coverage",
    body: "The engine starts at 1 and advances one integer at a time, preserving a clear verified range.",
  },
  {
    label: "02",
    title: "Trajectory evaluation",
    body: "Each integer is evaluated with the Collatz rule until the sequence reaches 1.",
  },
  {
    label: "03",
    title: "Verified batches",
    body: "Results are written in batches for efficiency while maintaining sequential coverage.",
  },
  {
    label: "04",
    title: "Live catalog",
    body: "The dashboard reads from the verified catalog and updates as new batches complete.",
  },
  {
    label: "05",
    title: "Integrity checks",
    body: "Checks monitor duplicate entries, missing ranges, and record consistency.",
  },
  {
    label: "06",
    title: "Computational scope",
    body: "This is computational exploration, not a proof of the conjecture.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
            How the Engine Works
          </h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            The Collatz Engine evaluates each integer in order, records the trajectory
            statistics, and updates this dashboard from the verified catalog. Batching
            improves performance without skipping integers. This project is a public
            computational exploration, not a proof.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.label}
              className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                  {step.label}
                </span>
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {step.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
