"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

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
    body: "The Collatz Engine uses computation to catalog, analyze, and visualize Collatz sequences for positive integers as the verified catalog grows. It surfaces unusual trajectories and records without claiming proof.",
    cta: "Learn more →",
  },
  {
    num: "5",
    title: "FAQs",
    body: "Is the Collatz Conjecture proven? What is the largest number tested? How are records determined? Can I contribute? Where can I see more data? All questions answered in our FAQ section.",
    cta: "View all FAQs →",
  },
];

const modalContent: Record<
  string,
  {
    intro?: string;
    points?: string[];
    faqs?: { question: string; answer: string }[];
  }
> = {
  "What is the Collatz Conjecture?": {
    intro:
      "The Collatz Conjecture begins with any positive integer and applies one of two simple rules repeatedly.",
    points: [
      "If the number is even, divide it by 2.",
      "If the number is odd, multiply it by 3 and add 1.",
      "Repeat the process with the new value.",
      "The conjecture says every positive integer eventually reaches 1.",
      "It remains unproven.",
    ],
  },
  "Definition of the Collatz Function": {
    intro:
      "The Collatz function is a rule for moving from one integer to the next in a sequence.",
    points: [
      "f(n) = n / 2 if n is even.",
      "f(n) = 3n + 1 if n is odd.",
      "The engine applies this function repeatedly and records trajectory statistics.",
      "Those records support computational exploration, not a proof claim.",
    ],
  },
  "Behavior of Collatz Sequences": {
    intro:
      "Collatz sequences can behave very differently even though they follow the same two rules.",
    points: [
      "Some sequences fall quickly.",
      "Some climb high before descending.",
      "Some take many steps before reaching 1.",
      "No counterexample has been found through extensive computation, but computation alone is not proof.",
    ],
  },
  "How The Collatz Engine Works": {
    intro:
      "The Collatz Engine is an autonomous computation system that builds a public verified catalog.",
    points: [
      "The engine starts at 1 and advances sequentially.",
      "It processes integers in verified batches.",
      "Completed results are stored in the catalog.",
      "The dashboard displays live state, records, trajectories, heatmaps, and integrity checks.",
      "This is computational exploration, not proof of the conjecture.",
    ],
  },
  FAQs: {
    faqs: [
      {
        question: "Is the Collatz Conjecture proven?",
        answer: "No.",
      },
      {
        question: "Does this engine prove it?",
        answer: "No. It explores and catalogs computational behavior.",
      },
      {
        question: "Does the engine skip numbers?",
        answer: "No. It processes integers sequentially in verified batches.",
      },
      {
        question: "Why does the dashboard appear to jump?",
        answer:
          "It writes completed batches to the catalog instead of updating after every single integer.",
      },
      {
        question: "Can I export data?",
        answer: "Yes. Use the public API and export tools.",
      },
      {
        question: "Can I contribute?",
        answer: "Yes. Use the Get Involved form.",
      },
    ],
  },
};

export function AboutSection() {
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const activeContent = activeTitle ? modalContent[activeTitle] : null;

  return (
    <section
      id="about"
      className="scroll-mt-20 bg-slate-50 px-4 py-12 dark:bg-slate-900/40 sm:py-16"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
            The Collatz Conjecture
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            A plain-language guide to one of mathematics&apos; most intriguing open problems
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((sec) => (
            <div key={sec.num} className="engine-card flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-600 dark:text-teal-400">
                  {sec.num}
                </span>
                <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                  {sec.title}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {sec.body}
              </p>
              <button
                type="button"
                onClick={() => setActiveTitle(sec.title)}
                className="mt-auto text-left text-xs font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
              >
                {sec.cta}
              </button>
            </div>
          ))}

          {/* Table of contents card */}
          <div className="engine-card">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Table of Contents
            </p>
            <ol className="space-y-2">
              {sections.map((sec) => (
                <li key={sec.num}>
                  <a
                    href="#about"
                    className="flex items-start gap-2 rounded-md px-1 py-0.5 text-xs text-slate-600 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                  >
                    <span className="mt-px shrink-0 text-slate-400 dark:text-slate-600">
                      {sec.num}.
                    </span>
                    <span>{sec.title}</span>
                  </a>
                </li>
              ))}
              {[
                { num: "6", label: "Data, Records & Methodology", href: "#records" },
                { num: "7", label: "Contact / Contribute / Support", href: "#contribute" },
              ].map((extra) => (
                <li key={extra.num}>
                  <a
                    href={extra.href}
                    className="flex items-start gap-2 rounded-md px-1 py-0.5 text-xs text-slate-600 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                  >
                    <span className="mt-px shrink-0 text-slate-400 dark:text-slate-600">
                      {extra.num}.
                    </span>
                    <span>{extra.label}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Modal
        open={activeTitle !== null}
        onClose={() => setActiveTitle(null)}
        title={activeTitle ?? ""}
        maxWidth="max-w-2xl"
      >
        {activeContent?.intro && (
          <p className="text-sm leading-relaxed text-slate-300">{activeContent.intro}</p>
        )}
        {activeContent?.points && (
          <ul className="mt-5 space-y-3">
            {activeContent.points.map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed text-slate-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
        {activeContent?.faqs && (
          <div className="space-y-4">
            {activeContent.faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-sm font-semibold text-slate-100">{faq.question}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </section>
  );
}
