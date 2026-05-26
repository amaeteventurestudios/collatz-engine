"use client";

import { useState } from "react";

const logTabs = [
  "Latest Note",
  "Batch Analysis",
  "Pattern Report",
  "Deep Report",
  "Observations for Review",
  "Weekly Digest",
];

const placeholderNotes = [
  {
    tag: "System",
    statusBadge: "Private Draft",
    statusBadgeColor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    reviewBadge: "Needs Admin Review",
    time: "Phase 4 — No data yet",
    title: "Awaiting first computation batch",
    body: "AI-assisted observations will be drafted once the computation engine begins processing trajectories. Drafts are private and require admin approval before appearing here.",
  },
  {
    tag: "Pattern Report",
    statusBadge: "Private Draft",
    statusBadgeColor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    reviewBadge: "Needs Admin Review",
    time: "Pending",
    title: "No patterns detected yet",
    body: "Statistical pattern analysis requires sufficient trajectory data to be meaningful. Analysis begins automatically when batch processing starts and produces approved output.",
  },
];

export function AIResearchLog() {
  const [activeTab, setActiveTab] = useState("Latest Note");

  return (
    <section id="research" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-teal-500">✦</span>
              <p className="section-heading">AI Research Log</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-200/80 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-700/80 dark:text-slate-400">
                0 approved notes
              </span>
              <button className="shrink-0 text-[11px] font-medium text-teal-600 hover:underline dark:text-teal-400">
                View all
              </button>
            </div>
          </div>

          {/* Credibility / human-review notice — more prominent */}
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-blue-500/30 bg-blue-500/8 px-4 py-3.5 dark:border-blue-400/30 dark:bg-blue-400/8">
            <span className="mt-0.5 shrink-0 text-base text-blue-500 dark:text-blue-400">ℹ</span>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
                  Human review required — approved notes only
                </p>
                <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  Guardrail Active
                </span>
              </div>
              <p className="text-xs leading-relaxed text-blue-600/80 dark:text-blue-300/70">
                All AI observations are generated as private drafts and require explicit admin
                approval before public release. No note appears here until reviewed. This log makes
                no claims about the conjecture.
              </p>
            </div>
          </div>

          {/* Tabs — horizontally scrollable on mobile */}
          <div className="-mx-5 mb-5 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {logTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-teal-500/20 text-teal-600 ring-1 ring-teal-500/30 dark:text-teal-400"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            {placeholderNotes.map((note) => (
              <div
                key={note.title}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                    {note.tag}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${note.statusBadgeColor}`}
                  >
                    {note.statusBadge}
                  </span>
                  <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                    {note.reviewBadge}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{note.time}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {note.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {note.body}
                </p>
              </div>
            ))}
          </div>

          {/* AI confidence bar */}
          <div className="mt-5 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
              AI Confidence
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-1.5 w-0 rounded-full bg-teal-500 transition-all duration-500" />
            </div>
            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
              Pending
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
