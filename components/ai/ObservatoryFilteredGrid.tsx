"use client";

import { useMemo, useState } from "react";
import type { DemoNote } from "@/lib/ai-observatory/demo-notes";
import { AIObservatoryNoteCard } from "@/components/ai/AIObservatoryNoteCard";

type FilterId = "all" | "batch" | "pattern" | "theoretical" | "digest";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all",         label: "All"                },
  { id: "digest",      label: "Weekly Digest"       },
  { id: "batch",       label: "Batch Analysis"      },
  { id: "pattern",     label: "Pattern Reports"     },
  { id: "theoretical", label: "Theoretical Lenses"  },
];

export function ObservatoryFilteredGrid({ notes }: { notes: DemoNote[] }) {
  const [active, setActive] = useState<FilterId>("all");

  const filtered = useMemo(
    () => (active === "all" ? notes : notes.filter((n) => n.tabCategory === active)),
    [notes, active],
  );

  return (
    <div>
      {/* Filter pills */}
      <div
        role="group"
        aria-label="Filter notes by type"
        className="no-scrollbar mb-6 flex snap-x snap-mandatory justify-start gap-2 overflow-x-auto text-center sm:justify-center"
      >
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={active === f.id}
            onClick={() => setActive(f.id)}
            className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${
              active === f.id
                ? "bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
          No published notes in this category yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <AIObservatoryNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
