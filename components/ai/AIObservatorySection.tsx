"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  TAB_IDS,
  TAB_LABELS,
  TAB_TOOLTIPS,
  getFeaturedNote,
  getSupportingNotes,
  type TabId,
} from "@/lib/ai-observatory/demo-notes";
import { AIObservatoryFeaturedNote } from "@/components/ai/AIObservatoryFeaturedNote";
import { AIObservatoryNoteCard } from "@/components/ai/AIObservatoryNoteCard";
import { AIObservatoryDisclaimer } from "@/components/ai/AIObservatoryDisclaimer";
import { GlowingInfoIcon } from "@/components/ai/GlowingInfoIcon";

export function AIObservatorySection() {
  const [activeTab, setActiveTab] = useState<TabId>("latest");

  const featuredNote = getFeaturedNote(activeTab);
  const supportingNotes = featuredNote ? getSupportingNotes(featuredNote.id) : [];

  return (
    <section id="observatory" className="scroll-mt-20 px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">

          {/* Header */}
          <div className="mb-1 flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-lg text-teal-400 glow-teal" aria-hidden>✦</span>
              <h2 className="text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
                AI Observatory Notes
              </h2>
              <GlowingInfoIcon
                tooltip="AI notes summarize verified engine data after human review."
                align="left"
              />
            </div>
            <Link
              href="/observatory"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 px-3.5 py-2 text-xs font-semibold text-teal-300 transition-colors hover:bg-teal-500/10"
            >
              View all notes
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {/* Subtitle */}
          <div className="mb-5 flex items-start gap-2">
            <p className="text-sm leading-relaxed text-slate-400">
              AI-assisted summaries generated from verified Collatz Engine data.
              Notes require human review before publication and do not claim to prove the conjecture.
            </p>
            <GlowingInfoIcon
              tooltip="All summaries are generated from verified computational records and reviewed before publication. No note claims to prove the Collatz Conjecture."
              align="right"
              size="sm"
            />
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Observatory note categories"
            className="no-scrollbar -mx-5 mb-6 flex overflow-x-auto border-b border-slate-800 px-5 sm:mx-0 sm:px-0"
          >
            {TAB_IDS.map((tab) => (
              <div key={tab} className="relative flex items-center gap-1 pr-1">
                <button
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`tabpanel-${tab}`}
                  id={`tab-${tab}`}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-3 pb-3 pt-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${
                    activeTab === tab
                      ? "text-teal-400"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
                {/* Active underline */}
                {activeTab === tab && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-0 left-0 right-1 h-0.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                  />
                )}
                <GlowingInfoIcon tooltip={TAB_TOOLTIPS[tab]} align="center" size="sm" />
              </div>
            ))}
          </div>

          {/* Tab panel */}
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
          >
            {/* Featured note */}
            {featuredNote && (
              <AIObservatoryFeaturedNote note={featuredNote} />
            )}

            {/* Supporting cards */}
            {supportingNotes.length > 0 && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {supportingNotes.map((note) => (
                  <AIObservatoryNoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <AIObservatoryDisclaimer />
        </div>
      </div>
    </section>
  );
}
