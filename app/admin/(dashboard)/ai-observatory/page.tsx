import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";

export const dynamic = "force-dynamic";

function SectionHeading({ id, children, help }: {
  id?: string; children: React.ReactNode; help?: React.ReactNode;
}) {
  return (
    <h2 id={id} className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-teal-500">
      <span className="h-px flex-1 bg-slate-800" />
      <span className="flex shrink-0 items-center gap-1.5">{children}{help}</span>
      <span className="h-px flex-1 bg-slate-800" />
    </h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>{children}</div>;
}

const PLANNED_SECTIONS = [
  {
    icon: "◈",
    title: "AI Notes",
    status: "Planned",
    description:
      "Automatically generated analysis notes from verified engine events — record breakdowns, pattern detections, and statistical observations. All notes are derived from real computation data.",
    constraint: "Nothing is generated or published without human review.",
  },
  {
    icon: "◎",
    title: "Drafts",
    status: "Planned",
    description:
      "AI-assisted draft reports pending human review before publication. Drafts are created from verified records and checked for factual accuracy before being released.",
    constraint: "Drafts require explicit human approval before publishing.",
  },
  {
    icon: "◉",
    title: "Published Reports",
    status: "Planned",
    description:
      "Reviewed and published analysis reports generated from engine data. Each published report includes its data source, generation date, and verification status.",
    constraint: "Only content that has passed human review appears here.",
  },
];

export default function AIObservatoryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">AI Observatory</h1>
            <PanelHelp
              title="AI Observatory"
              description="Planned workflow for AI-assisted analysis publishing — notes, drafts, and reviewed reports from engine data."
              details="The AI Observatory is designed as a human-in-the-loop system. Nothing auto-publishes. AI-generated content requires explicit human review before becoming visible."
              operatorNote="No AI content should ever be published automatically. Human review is required at every stage."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">AI analysis notes, drafts pending review, published reports</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Coming-later notice */}
      <div className="rounded-xl border border-purple-900/30 bg-purple-950/15 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="text-xl text-purple-400">◈</span>
          <div>
            <p className="text-sm font-semibold text-purple-300">AI Observatory — Coming Later</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-purple-300/60">
              The AI Observatory publishing workflow is planned for a future phase. It will enable reviewed, human-approved
              AI analysis of Collatz computation patterns to be published from verified engine data.
              No fake or auto-generated content will appear here without explicit human approval.
            </p>
          </div>
        </div>
      </div>

      {/* Planned sections */}
      <section>
        <SectionHeading id="planned">Planned Sections</SectionHeading>
        <div className="space-y-4">
          {PLANNED_SECTIONS.map((s) => (
            <Card key={s.title}>
              <div className="flex items-start gap-4">
                <span className="mt-0.5 text-2xl text-purple-400">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-200">{s.title}</p>
                    <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-400">{s.description}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-orange-400/80">
                    <span>⚠</span>
                    <span>{s.constraint}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Design principles */}
      <section>
        <SectionHeading id="principles">Design Principles</SectionHeading>
        <Card>
          <ul className="space-y-2 text-[11px]">
            {[
              "All content is derived from verified computation data, never invented.",
              "AI notes are informational, not mathematical proofs.",
              "Human review is required before any draft becomes published.",
              "Nothing auto-publishes. Every publication requires an explicit admin action.",
              "Published reports must cite their data source and verification status.",
              "AI-generated content is clearly labeled as such.",
              "The AI Observatory does not imply the Collatz Conjecture is proved or disproved.",
            ].map((p) => (
              <li key={p} className="flex items-start gap-2 text-slate-400">
                <span className="mt-0.5 text-teal-500">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* AI Observatory link */}
      <section>
        <SectionHeading id="public-link">Public Observatory</SectionHeading>
        <Card>
          <p className="mb-4 text-[11px] text-slate-500">
            The public AI Observatory page (for viewing published AI analysis) is available at:
          </p>
          <Link
            href="/observatory"
            className="inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-teal-950/20 px-4 py-2 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
          >
            View Public Observatory ↗
          </Link>
        </Card>
      </section>

    </div>
  );
}
