export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, FlaskConical, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getPublishedNotes } from "@/lib/ai-observatory/store";
import { REPORT_TYPE_META, type DemoNote } from "@/lib/ai-observatory/demo-notes";
import { ObservatoryFilteredGrid } from "@/components/ai/ObservatoryFilteredGrid";

// ─── Hero ────────────────────────────────────────────────────────────────────

function ObservatoryHero() {
  return (
    /*
     * bg-slate-950 is the solid fallback colour shown when the hero image is
     * absent during build or local development.  The <div> with
     * backgroundImage silently no-ops when the file does not exist, so the
     * gradient-only version renders cleanly without any JavaScript error
     * handling.  The final WebP should be placed at:
     *   public/images/observatory/observatory-hero.webp  (1600 × 520 px)
     */
    <section className="relative overflow-hidden bg-slate-950">
      {/* Hero image layer — silent CSS fallback when file is absent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/images/observatory/observatory-hero.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center right",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Gradient overlay — keeps text readable whether image is present or not */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/50"
      />
      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(45,212,191,1) 1px, transparent 1px), linear-gradient(90deg, rgba(45,212,191,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24">
        <div className="max-w-2xl">
          {/* Label */}
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-teal-400 glow-teal" aria-hidden>✦</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
              AI Observatory
            </span>
          </div>

          {/* Title */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
            AI Observatory Notes
          </h1>

          {/* Subtitle */}
          <p className="mb-3 text-lg leading-relaxed text-slate-300">
            Reviewed AI-assisted interpretation of verified Collatz Engine data.
          </p>

          {/* Supporting copy */}
          <p className="mb-8 text-sm leading-relaxed text-slate-400">
            Reports summarize verified computation records, highlight notable trajectory behaviour,
            and explain mathematical lenses without claiming proof.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: ShieldCheck, label: "Human-reviewed"   },
              { icon: Database,    label: "Verified data only" },
              { icon: FlaskConical, label: "No proof claims"  },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-300"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Latest note card ─────────────────────────────────────────────────────────

function LatestNoteCard({ note }: { note: DemoNote }) {
  const meta = REPORT_TYPE_META[note.reportType];

  return (
    <div className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-900 p-6">
      {/* Badge + date */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">Published {note.publishedAt}</span>
        <span className="text-xs text-slate-600">· Reviewed by {note.reviewedBy}</span>
      </div>

      {/* Title */}
      <h2 className="mb-2 text-xl font-bold leading-snug text-slate-50">
        {note.title}
      </h2>

      {/* Summary */}
      <p className="mb-5 flex-1 text-sm leading-relaxed text-slate-400">
        {note.summary}
      </p>

      {/* Key stats */}
      {note.stats.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {note.stats.slice(0, 4).map((stat) => (
            <div key={stat.label} className="rounded-lg bg-slate-800/60 p-3">
              <p className={`text-lg font-bold tabular-nums ${stat.highlight ? "text-rose-400" : "text-teal-400"}`}>
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-slate-300">{stat.label}</p>
              <p className="text-[9px] text-slate-500">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/observatory/${note.id}`}
        className="inline-flex w-max items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-500/10 px-4 py-2.5 text-sm font-semibold text-teal-300 transition-colors hover:bg-teal-500/20 hover:text-teal-200"
      >
        Read full note
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}

// ─── Observatory status panel ─────────────────────────────────────────────────

interface StatusRow { label: string; value: string }

function StatusPanel({
  notes,
}: {
  notes: DemoNote[];
}) {
  const count = notes.length;
  const typeCount = new Set(notes.map((n) => n.reportType)).size;
  const latestDate = notes[0]?.publishedAt ?? "—";

  const rows: StatusRow[] = [
    { label: "Published notes",  value: String(count)       },
    { label: "Report types",     value: String(typeCount)   },
    { label: "Latest update",    value: latestDate          },
    { label: "Review mode",      value: "Human approved"    },
    { label: "Data source",      value: "Verified engine records" },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-slate-700/60 bg-slate-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-teal-400" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400">
          Observatory Status
        </p>
      </div>

      <ul className="mb-5 flex-1 space-y-3">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
            <span className="text-xs text-slate-500">{row.label}</span>
            <span className="text-right text-xs font-semibold text-slate-200">{row.value}</span>
          </li>
        ))}
      </ul>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-400/15 bg-amber-400/5 px-3.5 py-3">
        <p className="text-[10px] leading-relaxed text-amber-300/70">
          AI notes summarize verified engine data. They do not constitute a proof of the Collatz
          Conjecture.
        </p>
      </div>
    </div>
  );
}

// ─── Interpretation guide ─────────────────────────────────────────────────────

function InterpretationGuide() {
  const panels = [
    {
      title: "Verified Data",
      body: "All numbers and metrics come from the Collatz Engine's verified computation records. These are the foundation of every observation.",
      accent: "teal",
      icon: Database,
    },
    {
      title: "AI-Assisted Observation",
      body: "AI models analyse verified data to identify patterns, structures, and behaviours. Observations are written in plain English for clarity and review.",
      accent: "blue",
      icon: FlaskConical,
    },
    {
      title: "What This Does Not Prove",
      body: "Finite computation does not equal mathematical proof. These notes explain behaviour, not certainty beyond the verified range.",
      accent: "amber",
      icon: ShieldCheck,
    },
  ] as const;

  const accentMap = {
    teal:  { border: "border-teal-400/20",  icon: "text-teal-400",  title: "text-teal-300"  },
    blue:  { border: "border-blue-400/20",  icon: "text-blue-400",  title: "text-blue-300"  },
    amber: { border: "border-amber-400/20", icon: "text-amber-400", title: "text-amber-300" },
  };

  return (
    <div className="mb-8">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Reference
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-100">
          How to Read Observatory Notes
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {panels.map((p) => {
          const a = accentMap[p.accent];
          const Icon = p.icon;
          return (
            <div
              key={p.title}
              className={`rounded-xl border ${a.border} bg-slate-900 p-5`}
            >
              <Icon className={`mb-3 h-5 w-5 ${a.icon}`} aria-hidden />
              <h3 className={`mb-2 text-sm font-bold ${a.title}`}>{p.title}</h3>
              <p className="text-xs leading-relaxed text-slate-400">{p.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ObservatoryPage() {
  const notes = await getPublishedNotes();
  const latestNote = notes[0] ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <Header />

      <main className="flex-1">
        <ObservatoryHero />

        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2">
            <Link href="/" className="text-xs text-slate-500 transition-colors hover:text-teal-400">
              Home
            </Link>
            <span className="text-xs text-slate-700">/</span>
            <span className="text-xs text-slate-400">Observatory</span>
          </nav>

          {/* Feature area — latest note + status */}
          {latestNote && (
            <div className="mb-12 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
              <LatestNoteCard note={latestNote} />
              <StatusPanel notes={notes} />
            </div>
          )}

          {/* Archive section */}
          <div className="mb-12">
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Report Archive
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-100">
                Published Observatory Notes
              </h2>
            </div>
            <ObservatoryFilteredGrid notes={notes} />
          </div>

          {/* Interpretation guide */}
          <InterpretationGuide />

          {/* Bottom disclaimer */}
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 px-5 py-4">
            <p className="text-sm leading-relaxed text-slate-400">
              All AI Observatory Notes are reviewed by a human before publication. They summarise
              verified engine data and interpretations. They do not constitute a proof of the
              Collatz Conjecture.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
