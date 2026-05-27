import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Public API | The Collatz Engine",
  description:
    "Read-only documentation for live Collatz catalog state, records, integrity summaries, and exportable samples.",
};

const endpoints = [
  {
    path: "/api/collatz/state",
    purpose: "Returns the current public engine state and latest verified catalog boundary.",
    parameters: "None.",
    limits: "Read-only status endpoint. No catalog rows are returned.",
    request: "GET /api/collatz/state",
    response: `{
  "ok": true,
  "generatedAt": "2026-05-27T00:00:00.000Z",
  "status": "running",
  "numbersCataloged": 125000,
  "highestVerifiedN": 125000,
  "currentlyAnalyzingN": 125001,
  "lastVerifiedBatch": { "start": 124901, "end": 125000, "size": 100 },
  "nextBatchQueued": { "start": 125001, "end": 125100, "size": 100 },
  "throughput": { "numbersPerSecond": 240, "lastBatchDurationMs": 416 },
  "heartbeatAgeSeconds": 12,
  "runtimeSeconds": 86400
}`,
    notes: "Useful for dashboards, monitors, and public status displays.",
  },
  {
    path: "/api/collatz/latest?limit=10",
    purpose: "Returns the latest verified catalog results, ordered from newest verified n downward.",
    parameters: "limit: optional positive integer, capped at 100. Defaults to 25.",
    limits: "Returns a bounded result set only.",
    request: "GET /api/collatz/latest?limit=10",
    response: `{
  "ok": true,
  "generatedAt": "2026-05-27T00:00:00.000Z",
  "highestVerifiedN": 125000,
  "limit": 10,
  "count": 10,
  "data": [
    {
      "n": 125000,
      "steps_to_one": 128,
      "highest_peak": 923200,
      "peak_ratio": 7.3856,
      "reached_one": true,
      "cataloged_at": "2026-05-27T00:00:00.000Z"
    }
  ]
}`,
    notes: "Values are computational catalog records. They do not constitute a proof.",
  },
  {
    path: "/api/collatz/records",
    purpose: "Returns current public record holders for trajectory length, highest peak, and peak ratio.",
    parameters: "None.",
    limits: "Peak-ratio record is computed from a bounded high-peak catalog sample.",
    request: "GET /api/collatz/records",
    response: `{
  "ok": true,
  "generatedAt": "2026-05-27T00:00:00.000Z",
  "catalogSize": 125000,
  "highestVerifiedN": 125000,
  "longestTrajectoryRecord": { "n": 77031, "steps_to_one": 350 },
  "highestPeakRecord": { "n": 106239, "highest_peak": 104674832 },
  "highestPeakRatioRecord": { "n": 77671, "peak_ratio": 2018.1 },
  "highestPeakRatioRecordScope": "computed from the highest-peak catalog sample"
}`,
    notes: "Record objects use the same public result shape as latest and export endpoints.",
  },
  {
    path: "/api/collatz/near-escapes?limit=10&sort=peak_ratio",
    purpose: "Returns high-interest candidates ranked by peak ratio, steps, peak, or n.",
    parameters: "limit: optional positive integer, capped at 100. sort: peak_ratio, steps, peak, or n.",
    limits: "For peak_ratio sorting, ranking is derived from a bounded high-peak sample.",
    request: "GET /api/collatz/near-escapes?limit=10&sort=peak_ratio",
    response: `{
  "ok": true,
  "generatedAt": "2026-05-27T00:00:00.000Z",
  "highestVerifiedN": 125000,
  "limit": 10,
  "sort": "peak_ratio",
  "count": 10,
  "data": [
    {
      "n": 77671,
      "steps_to_one": 231,
      "highest_peak": 156914378,
      "peak_ratio": 2018.1,
      "reached_one": true,
      "flags": ["high_peak_ratio", "long_path"]
    }
  ],
  "scope": "ranked from the highest-peak catalog sample"
}`,
    notes: "Near-escape is a public dashboard label for notable trajectories, not a mathematical exception.",
  },
  {
    path: "/api/collatz/integrity",
    purpose: "Returns a bounded live integrity summary for the public dashboard.",
    parameters: "None.",
    limits: "The public endpoint checks a recent bounded range for performance.",
    request: "GET /api/collatz/integrity",
    response: `{
  "ok": true,
  "checkedAt": "2026-05-27T00:00:00.000Z",
  "scope": "latest_range",
  "scopeSize": 1000,
  "highestVerifiedN": 125000,
  "numbersCataloged": 125000,
  "checks": {
    "duplicates": { "ok": true, "count": 0, "sample": [] },
    "missingRanges": { "ok": true, "count": 0, "sample": [] },
    "stateMatchesCatalog": { "ok": true },
    "heartbeat": { "ok": true, "ageSeconds": 12 },
    "statusReadable": { "ok": true, "status": "running" }
  }
}`,
    notes: "For full catalog verification, use the repository integrity command documented in the project source.",
  },
  {
    path: "/api/collatz/export?format=json&limit=10",
    purpose: "Returns an exportable JSON sample from the verified public catalog.",
    parameters: "format: json. limit: optional positive integer, capped at 10000. offset: optional non-negative integer. order: asc or desc.",
    limits: "Exports are capped samples, not unlimited full-catalog dumps.",
    request: "GET /api/collatz/export?format=json&limit=10",
    response: `{
  "ok": true,
  "generatedAt": "2026-05-27T00:00:00.000Z",
  "highestVerifiedN": 125000,
  "limit": 10,
  "offset": 0,
  "order": "desc",
  "count": 10,
  "data": [{ "n": 125000, "steps_to_one": 128 }]
}`,
    notes: "Use this for small public analysis samples and reproducible examples.",
  },
  {
    path: "/api/collatz/export?format=csv&limit=10",
    purpose: "Returns an exportable CSV sample from the verified public catalog.",
    parameters: "format: csv. limit: optional positive integer, capped at 10000. offset: optional non-negative integer. order: asc or desc.",
    limits: "Exports are capped samples, not unlimited full-catalog dumps.",
    request: "GET /api/collatz/export?format=csv&limit=10",
    response: `n,steps_to_one,highest_peak,peak_ratio,reached_one,cataloged_at
125000,128,923200,7.3856,true,2026-05-27T00:00:00.000Z`,
    notes: "CSV responses are returned as downloadable public catalog samples.",
  },
];

function EndpointCard({ endpoint }: { endpoint: (typeof endpoints)[number] }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300">
            Endpoint
          </p>
          <h2 className="mt-1 break-all font-mono text-sm font-bold text-slate-50">
            {endpoint.path}
          </h2>
        </div>
        <a
          href={endpoint.path}
          className="rounded border border-slate-700 px-3 py-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-slate-900"
        >
          Open
        </a>
      </div>
      <div className="mt-5 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Purpose
          </p>
          <p className="mt-1 leading-relaxed">{endpoint.purpose}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Query Parameters
          </p>
          <p className="mt-1 leading-relaxed">{endpoint.parameters}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Limits
          </p>
          <p className="mt-1 leading-relaxed">{endpoint.limits}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Access
          </p>
          <p className="mt-1 leading-relaxed">
            Public read-only access. Do not send secrets or private data to these endpoints.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Example Request
          </p>
          <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
            <code>{endpoint.request}</code>
          </pre>
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Example Response Shape
          </p>
          <pre className="max-h-72 overflow-auto rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
            <code>{endpoint.response}</code>
          </pre>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">{endpoint.notes}</p>
    </article>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-600 dark:text-teal-400">
              Documentation
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
              Public API
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Read-only access to live catalog state, records, near-escape candidates, integrity
              summaries, and exportable samples.
            </p>
            <p className="mt-3 max-w-3xl rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
              These endpoints expose computational catalog data from the running engine. They do
              not constitute a proof of the Collatz Conjecture.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Back to dashboard
              </Link>
              <Link
                href="/methodology"
                className="rounded border border-teal-500/40 bg-teal-500/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 transition-colors hover:bg-teal-500/15 dark:text-teal-300"
              >
                Read methodology
              </Link>
            </div>
          </div>

          <div className="space-y-5">
            {endpoints.map((endpoint) => (
              <EndpointCard key={endpoint.path} endpoint={endpoint} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
