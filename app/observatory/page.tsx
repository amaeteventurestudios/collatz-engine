"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  TAB_IDS,
  TAB_LABELS,
  TAB_TOOLTIPS,
  DEMO_NOTES,
  getFeaturedNote,
  type TabId,
} from "@/lib/ai-observatory/demo-notes";
import { AIObservatoryFeaturedNote } from "@/components/ai/AIObservatoryFeaturedNote";
import { AIObservatoryNoteCard } from "@/components/ai/AIObservatoryNoteCard";
import { AIObservatoryDisclaimer } from "@/components/ai/AIObservatoryDisclaimer";
import { GlowingInfoIcon } from "@/components/ai/GlowingInfoIcon";

export default function ObservatoryPage() {
  const [activeTab, setActiveTab] = useState<TabId>("latest");

  const featuredNote = getFeaturedNote(activeTab);
  const archiveNotes = DEMO_NOTES.filter(
    (n) => n.isPublic && n.id !== featuredNote?.id,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-slate-500 transition-colors hover:text-teal-400"
              >
                Home
              </Link>
              <span className="text-xs text-slate-600">/</span>
              <span className="text-xs text-slate-400">Observatory</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl text-teal-400 glow-teal" aria-hidden>✦</span>
              <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-4xl">
                AI Observatory Notes
              </h1>
              <GlowingInfoIcon
                tooltip="AI notes summarize verified engine data after human review."
                align="left"
              />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Reviewed AI-assisted summaries generated from verified Collatz Engine data. All notes
              undergo human review before publication and do not claim to prove the conjecture.
            </p>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Observatory note categories"
            className="no-scrollbar mb-8 flex overflow-x-auto border-b border-slate-800"
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
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {featuredNote && (
              <div className="mb-6">
                <AIObservatoryFeaturedNote note={featuredNote} />
              </div>
            )}

            {/* Archive grid */}
            {archiveNotes.length > 0 && (
              <>
                <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                  Archive
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archiveNotes.map((note) => (
                    <AIObservatoryNoteCard key={note.id} note={note} />
                  ))}
                </div>
              </>
            )}
          </div>

          <AIObservatoryDisclaimer />
        </div>
      </main>

      <Footer />
    </div>
  );
}
