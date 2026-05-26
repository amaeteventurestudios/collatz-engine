const sections = [
  {
    num: "1",
    title: "What is the Collatz Conjecture?",
    body: "The Collatz Conjecture is a problem in mathematics that concerns a sequence defined by two rules: if a number is even, divide it by 2. If it is odd, multiply it by 3 and add 1. Repeat this process with the result.",
    cta: "Learn more →",
  },
  {
    num: "2",
    title: "Definition of the Collatz Function",
    body: "Let n be a positive integer. Define f(n) as: n/2 if n is even, or 3n+1 if n is odd. The conjecture states that for every positive integer n, repeated application of f eventually reaches 1.",
    cta: "Learn more →",
  },
  {
    num: "3",
    title: "Behavior of Collatz Sequences",
    body: "Collatz sequences exhibit a fascinating mix of seemingly chaotic rises and steady descents. Most trajectories peak early and then decline irregularly toward 1. Despite extensive computation, no counterexample has ever been found.",
    cta: "Learn more →",
  },
  {
    num: "4",
    title: "How The Collatz Engine Works",
    body: "The Collatz Engine uses computing to catalog, analyze, and visualize Collatz sequences for all positive integers up to very large values. It flags unusual values and leverages AI-assisted analysis to support research into this enduring mathematical mystery.",
    cta: "Learn more →",
  },
  {
    num: "5",
    title: "FAQs",
    body: "Common questions: Is the Collatz Conjecture proven? What is the largest number tested? How are records determined? Can I contribute? Where can I see more data?",
    cta: "View all FAQs →",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 bg-slate-50 px-4 py-12 dark:bg-slate-900/40 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
          The Collatz Conjecture: An Introduction
        </h2>
        <p className="mb-8 text-center text-sm text-slate-500 dark:text-slate-400">
          A plain-language guide to one of mathematics&apos; most intriguing open problems
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((sec) => (
            <div
              key={sec.num}
              className="engine-card flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
                  {sec.num}
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {sec.title}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {sec.body}
              </p>
              <button className="mt-auto text-left text-xs font-medium text-teal-600 hover:underline dark:text-teal-400">
                {sec.cta}
              </button>
            </div>
          ))}

          {/* Table of contents card */}
          <div className="engine-card">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Table of Contents
            </p>
            <ol className="space-y-1.5">
              {sections.map((sec) => (
                <li key={sec.num}>
                  <a
                    href={`#about`}
                    className="flex items-start gap-2 text-xs text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                  >
                    <span className="shrink-0 text-slate-400">{sec.num}.</span>
                    {sec.title}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contribute"
                  className="flex items-start gap-2 text-xs text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  <span className="shrink-0 text-slate-400">6.</span>
                  Data, Records &amp; Methodology
                </a>
              </li>
              <li>
                <a
                  href="#contribute"
                  className="flex items-start gap-2 text-xs text-slate-600 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  <span className="shrink-0 text-slate-400">7.</span>
                  Contact / Contribute / Support
                </a>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
