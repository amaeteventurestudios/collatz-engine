import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DemoNote } from "@/lib/ai-observatory/demo-notes";
import { REPORT_TYPE_META } from "@/lib/ai-observatory/demo-notes";
import { GlowingInfoIcon } from "@/components/ai/GlowingInfoIcon";

interface AIObservatoryNoteCardProps {
  note: DemoNote;
}

export function AIObservatoryNoteCard({ note }: AIObservatoryNoteCardProps) {
  const meta = REPORT_TYPE_META[note.reportType];
  const miniStats = note.stats.slice(0, 2);

  return (
    <div className="group flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-4 text-center transition-colors hover:border-slate-700 sm:text-left">
      {/* Top row: badge + date */}
      <div className="mb-3 flex flex-col items-center justify-between gap-2 sm:flex-row">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${meta.badgeClass}`}>
          {meta.label}
        </span>
        <span className="text-[10px] text-slate-500">{note.publishedAt}</span>
      </div>

      {/* Title */}
      <p className="mb-1.5 text-sm font-semibold leading-snug text-slate-100">
        {note.title}
      </p>

      {/* Summary */}
      <p className="mb-4 flex-1 text-xs leading-relaxed text-slate-400 line-clamp-3">
        {note.summary}
      </p>

      {/* Mini stats */}
      {miniStats.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
          {miniStats.map((stat) => (
            <div key={stat.label} className="flex items-baseline justify-center gap-1.5">
              <span className="text-sm font-bold tabular-nums text-teal-400">{stat.value}</span>
              <span className="text-[10px] text-slate-500">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-center gap-4 sm:justify-between">
        <Link
          href={`/observatory/${note.id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-400 transition-colors hover:text-teal-300"
        >
          Read note
          <ArrowRight className="h-3 w-3" />
        </Link>
        <GlowingInfoIcon
          tooltip={`${note.reportType}: ${note.summary.slice(0, 80)}…`}
          align="right"
        />
      </div>
    </div>
  );
}
