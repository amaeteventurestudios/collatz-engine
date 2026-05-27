import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";

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
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
              How the Engine Works
            </h2>
            <PanelHelp
              title="How the Engine Works"
              description="Explains the engine's basic method: test numbers in order, record the results, verify the catalog, and display the data publicly."
              align="center"
            />
          </div>
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

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/docs/api"
            className="rounded border border-teal-500/40 bg-teal-500/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 transition-colors hover:bg-teal-500/15 dark:text-teal-300"
          >
            View API docs
          </Link>
          <Link
            href="/methodology"
            className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Read methodology
          </Link>
          <a
            href="/api/collatz/export?format=json&limit=1000"
            className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Export JSON sample
          </a>
          <a
            href="/api/collatz/export?format=csv&limit=1000"
            className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Export CSV sample
          </a>
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-500">
          Limited export samples are capped for public access.
        </p>
      </div>
    </section>
  );
}
