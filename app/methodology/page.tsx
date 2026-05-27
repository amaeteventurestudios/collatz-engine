import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Methodology | The Collatz Engine",
  description:
    "How The Collatz Engine evaluates integers, records trajectory statistics, and verifies public catalog integrity.",
};

const sections = [
  {
    title: "What the engine does",
    body: [
      "The engine starts at 1 and advances sequentially through positive integers.",
      "For each integer, it applies the Collatz rule: even values are divided by 2, and odd values are transformed by 3n + 1.",
      "The system records trajectory statistics such as steps to 1, highest peak, and peak ratio.",
      "The public dashboard is updated from verified catalog results produced by the running engine.",
    ],
  },
  {
    title: "Why batching is used",
    body: [
      "The engine evaluates integers sequentially, then writes completed results in batches for efficiency.",
      "Batching reduces write overhead and keeps the public catalog practical to update over time.",
      "Batching does not mean numbers are skipped. The verified range advances one integer at a time.",
    ],
  },
  {
    title: "What is verified",
    body: [
      "Duplicate catalog entries are checked.",
      "Missing ranges inside the verified catalog boundary are checked.",
      "Engine state and catalog boundaries are compared for alignment.",
      "Longest trajectory and highest peak records are checked for consistency.",
      "Worker heartbeat and status readability are checked for public health reporting.",
    ],
  },
  {
    title: "Full verification vs live bounded checks",
    body: [
      "The repository verification command performs a full read-only catalog integrity check.",
      "The public integrity API performs a bounded live check so the dashboard can report health without expensive full scans on every request.",
      "The bounded check is useful for live dashboard health, but it is not a substitute for the full verification scan.",
    ],
  },
  {
    title: "What this does not prove",
    body: [
      "Computational verification up to a limit is not a proof of the Collatz Conjecture.",
      "The platform is an autonomous public exploration system, not a claimed mathematical proof.",
      "Catalog records can support inspection, reproducibility, and public discussion without implying that the conjecture is solved.",
    ],
  },
];

export default function MethodologyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
              Methodology
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
              How Verification Works
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              The Collatz Engine is designed as a public, inspectable computational exploration
              system. It evaluates integers in order, records trajectory statistics, and separates
              live bounded health checks from full catalog verification.
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Back to dashboard
            </Link>
            <Link
              href="/docs/api"
              className="rounded border border-teal-500/40 bg-teal-500/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 transition-colors hover:bg-teal-500/15 dark:text-teal-300"
            >
              API docs
            </Link>
            <a
              href="/api/collatz/export?format=json&limit=1000"
              className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Export sample
            </a>
            <a
              href="https://github.com/amaeteventurestudios/collatz-engine"
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              GitHub repo
            </a>
            <Link
              href="/#contribute"
              className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Get involved
            </Link>
          </div>

          <div className="space-y-4">
            {sections.map((section, index) => (
              <section
                key={section.title}
                className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                  {section.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {section.body.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
