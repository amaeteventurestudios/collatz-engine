const methodSections = [
  {
    icon: "◈",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/8 dark:bg-teal-400/8",
    ring: "ring-teal-500/20",
    title: "What the engine catalogs",
    items: [
      "The full trajectory sequence for each starting number n",
      "Total step count (length of path to 1)",
      "Peak value reached and the step at which it occurs",
      "Peak ratio (peak / n) as a normalized comparison metric",
      "First descent delay — steps before the value first falls below n",
      "Odd-step count and odd-step density (odd steps / total steps)",
    ],
  },
  {
    icon: "▤",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/8 dark:bg-blue-400/8",
    ring: "ring-blue-500/20",
    title: "What data is stored",
    items: [
      "Compact batch summaries: max steps, peak values, ratios, and residue stats — not full sequences for every number",
      "Full sequences are reserved for record breakers, near-escape candidates, and selected demo samples",
      "Batch summary data is local until persistence is added in Phase 5",
      "Record-breaking trajectories are flagged and stored in full for inspection",
      "AI-drafted observation notes remain private until admin-approved",
      "No personally identifiable data is collected from visitors",
    ],
  },
  {
    icon: "✦",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/8 dark:bg-violet-400/8",
    ring: "ring-violet-500/20",
    title: "AI-assisted observations",
    items: [
      "An AI model reviews batches of trajectory statistics for statistical patterns",
      "Observations are generated as private draft notes — never published automatically",
      "Every observation requires explicit admin approval before appearing publicly",
      "Notes describe statistical observations only — no proof claims are made",
      "The AI model does not have access to unpublished drafts from other sessions",
    ],
  },
  {
    icon: "△",
    color: "text-orange-500 dark:text-orange-400",
    bg: "bg-orange-500/8 dark:bg-orange-400/8",
    ring: "ring-orange-500/20",
    title: "Why no proof claim",
    items: [
      "The Collatz Conjecture is an open problem in mathematics — no proof or disproof is known",
      "This engine verifies that specific numbers reach 1; it does not prove the general case",
      "Verification for n ≤ N tells us nothing about all n > N without a mathematical proof",
      "AI-drafted notes are statistical observations, not mathematical arguments",
      "This project makes no claim to be advancing a proof of the conjecture",
    ],
  },
];

export function DataMethodology() {
  return (
    <section id="methodology" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">
            Data &amp; Methodology
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            What this engine computes, stores, and observes — and what it does not claim
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {methodSections.map((section) => (
            <div
              key={section.title}
              className={`rounded-2xl border-0 p-5 ring-1 ${section.bg} ${section.ring}`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className={`text-base leading-none ${section.color}`}>{section.icon}</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {section.title}
                </p>
              </div>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${section.color} opacity-60`} />
                    <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
