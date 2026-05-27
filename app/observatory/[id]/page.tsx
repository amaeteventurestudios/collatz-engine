import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { REPORT_TYPE_META } from "@/lib/ai-observatory/demo-notes";
import { getPublishedNoteById } from "@/lib/ai-observatory/store";
import { AIObservatoryDisclaimer } from "@/components/ai/AIObservatoryDisclaimer";

export const dynamic = "force-dynamic";

export default async function ObservatoryNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getPublishedNoteById(id);
  if (!note) notFound();

  const meta = REPORT_TYPE_META[note.reportType];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumb */}
          <Link
            href="/observatory"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-teal-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to Observatory
          </Link>

          {/* Note header */}
          <div className="mb-8">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest ${meta.badgeClass}`}>
                {meta.label}
              </span>
              <span className="text-xs text-slate-400">Published {note.publishedAt}</span>
              <span className="text-xs text-slate-500">· Reviewed by {note.reviewedBy}</span>
            </div>
            <h1 className="text-2xl font-bold leading-snug text-slate-50 sm:text-3xl">
              {note.title}
            </h1>
            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {note.summary}
            </p>
          </div>

          {/* Verified data stats */}
          <div className="mb-8 rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Verified Data
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {note.stats.map((stat) => (
                <div key={stat.label}>
                  <p className={`text-2xl font-bold tabular-nums ${stat.highlight ? "text-rose-400" : "text-teal-400"}`}>
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-slate-300">{stat.label}</p>
                  <p className="text-[10px] text-slate-500">{stat.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI-Assisted Observation */}
          <div className="mb-8">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              AI-Assisted Observation
            </p>
            <div className="space-y-4">
              {note.body.map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-slate-300">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* What this does not prove */}
          <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400/80">
              What This Does Not Prove
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              This note documents verified computational observations. It does not constitute a
              mathematical proof of the Collatz Conjecture. No finite set of verified starting
              integers can prove that all positive integers eventually reach 1.
            </p>
          </div>

          <AIObservatoryDisclaimer />
        </div>
      </main>

      <Footer />
    </div>
  );
}
