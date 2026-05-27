import Link from "next/link";
import {
  ArrowRight,
  CheckCheck,
  TrendingUp,
  Triangle,
  Asterisk,
  LayoutList,
  Merge,
  Microscope,
  ArrowDownRight,
} from "lucide-react";
import type { DemoNote, NoteStat } from "@/lib/ai-observatory/demo-notes";
import { REPORT_TYPE_META } from "@/lib/ai-observatory/demo-notes";
import { GlowingInfoIcon } from "@/components/ai/GlowingInfoIcon";

function StatIcon({ variant }: { variant: NoteStat["iconVariant"] }) {
  const props = { className: "h-4 w-4", "aria-hidden": true } as const;
  switch (variant) {
    case "check":    return <CheckCheck {...props} />;
    case "trend":    return <TrendingUp {...props} />;
    case "peak":     return <Triangle {...props} />;
    case "record":   return <Asterisk {...props} />;
    case "count":    return <LayoutList {...props} />;
    case "merge":    return <Merge {...props} />;
    case "lens":     return <Microscope {...props} />;
    case "drift":    return <ArrowDownRight {...props} />;
    default:         return <CheckCheck {...props} />;
  }
}

interface StatBlockProps {
  stat: NoteStat;
}

function StatBlock({ stat }: StatBlockProps) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full border ${
        stat.highlight
          ? "border-rose-400/30 bg-rose-400/10 text-rose-400"
          : "border-teal-400/30 bg-teal-400/10 text-teal-400"
      }`}>
        <StatIcon variant={stat.iconVariant} />
      </div>
      <div>
        <p className={`text-2xl font-bold tabular-nums tracking-tight ${
          stat.highlight ? "text-rose-400" : "text-teal-400"
        }`}>
          {stat.value}
        </p>
        <p className="mt-0.5 text-xs font-medium text-slate-300">{stat.label}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="text-[10px] text-slate-500">{stat.sublabel}</p>
          <GlowingInfoIcon tooltip={`${stat.label}: ${stat.sublabel}`} align="right" size="sm" />
        </div>
      </div>
    </div>
  );
}

interface AIObservatoryFeaturedNoteProps {
  note: DemoNote;
}

export function AIObservatoryFeaturedNote({ note }: AIObservatoryFeaturedNoteProps) {
  const meta = REPORT_TYPE_META[note.reportType];

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950 shadow-lg shadow-slate-950/50">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
        {/* Left: text content */}
        <div className="p-6 sm:p-7">
          {/* Badge row */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${meta.badgeClass}`}>
              {meta.label}
            </span>
            <span className="text-xs text-slate-400">Published {note.publishedAt}</span>
            <span className="text-xs text-slate-500">· Reviewed by {note.reviewedBy}</span>
          </div>

          {/* Title */}
          <h3 className="mb-2 text-xl font-bold leading-snug text-slate-50 sm:text-2xl">
            {note.title}
          </h3>

          {/* Summary */}
          <p className="mb-6 text-sm leading-relaxed text-slate-400 sm:max-w-lg">
            {note.summary}
          </p>

          {/* Read note button */}
          <Link
            href={`/observatory/${note.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-500/20 hover:text-teal-200"
          >
            Read note
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Right: stat blocks */}
        <div className="border-t border-slate-800 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 divide-x divide-y divide-slate-800 lg:grid-cols-2 lg:grid-rows-2">
            {note.stats.map((stat) => (
              <StatBlock
                key={stat.label}
                stat={stat}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
