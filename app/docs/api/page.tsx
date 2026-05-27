import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PanelHelp } from "@/components/ui/PanelHelp";

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
  "ok": "boolean",
  "generatedAt": "ISO timestamp",
  "status": "engine status",
  "numbersCataloged": "number",
  "highestVerifiedN": "number",
  "currentlyAnalyzingN": "number",
  "lastVerifiedBatch": { "start": "number", "end": "number", "size": "number" },
  "nextBatchQueued": { "start": "number", "end": "number", "size": "number" },
  "throughput": { "numbersPerSecond": "number", "lastBatchDurationMs": "number" },
  "heartbeatAgeSeconds": "number",
  "runtimeSeconds": "number"
}`,
    notes: "Useful for dashboards, monitors, and public status displays.",
  },
  {
    path: "/api/collatz/health",
    purpose: "Returns public operating health for the autonomous engine and latest full integrity run.",
    parameters: "None.",
    limits: "Public-safe operational status only. No secrets, stack traces, or infrastructure details.",
    request: "GET /api/collatz/health",
    response: `{
  "ok": "boolean",
  "status": "health status",
  "heartbeatAgeSeconds": "number",
  "numbersCataloged": "number",
  "currentStatus": "engine status",
  "numbersPerSecond": "number",
  "lastRunAt": "ISO timestamp or null",
  "lastFullIntegrityRun": { "status": "status", "checkedAt": "ISO timestamp" },
  "message": "public status message"
}`,
    notes: "Useful for external status displays and lightweight uptime checks.",
  },
  {
    path: "/api/collatz/latest?limit=10",
    purpose: "Returns the latest verified catalog results, ordered from newest verified n downward.",
    parameters: "limit: optional positive integer, capped at 100. Defaults to 25.",
    limits: "Returns a bounded result set only.",
    request: "GET /api/collatz/latest?limit=10",
    response: `{
  "ok": "boolean",
  "generatedAt": "ISO timestamp",
  "highestVerifiedN": "number",
  "limit": "number",
  "count": "number",
  "data": [
    {
      "n": "number",
      "steps_to_one": "number",
      "highest_peak": "number",
      "peak_ratio": "number",
      "reached_one": "boolean",
      "cataloged_at": "ISO timestamp"
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
  "ok": "boolean",
  "generatedAt": "ISO timestamp",
  "catalogSize": "number",
  "highestVerifiedN": "number",
  "longestTrajectoryRecord": { "n": "number", "steps_to_one": "number" },
  "highestPeakRecord": { "n": "number", "highest_peak": "number" },
  "highestPeakRatioRecord": { "n": "number", "peak_ratio": "number" },
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
  "ok": "boolean",
  "generatedAt": "ISO timestamp",
  "highestVerifiedN": "number",
  "limit": "number",
  "sort": "peak_ratio",
  "count": "number",
  "data": [
    {
      "n": "number",
      "steps_to_one": "number",
      "highest_peak": "number",
      "peak_ratio": "number",
      "reached_one": "boolean",
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
  "ok": "boolean",
  "checkedAt": "ISO timestamp",
  "scope": "latest_range",
  "scopeSize": "number",
  "highestVerifiedN": "number",
  "numbersCataloged": "number",
  "checks": {
    "duplicates": { "ok": "boolean", "count": "number", "sample": [] },
    "missingRanges": { "ok": "boolean", "count": "number", "sample": [] },
    "stateMatchesCatalog": { "ok": "boolean" },
    "heartbeat": { "ok": "boolean", "ageSeconds": "number" },
    "statusReadable": { "ok": "boolean", "status": "engine status" }
  }
}`,
    notes: "For full catalog verification, use the integrity endpoint documented in the Methodology page.",
  },
  {
    path: "/api/collatz/integrity/latest",
    purpose: "Returns the latest persisted full catalog verification summary.",
    parameters: "None.",
    limits: "Returns summary fields only; detailed internal logs are not exposed.",
    request: "GET /api/collatz/integrity/latest",
    response: `{
  "ok": "boolean",
  "latest": {
    "status": "passed, failed, or warning",
    "checkedAt": "ISO timestamp",
    "highestVerifiedN": "number",
    "numbersCataloged": "number",
    "checksPassed": "number",
    "checksFailed": "number",
    "durationMs": "number",
    "duplicateCount": "number",
    "missingRangeCount": "number",
    "stateMatchesCatalog": "boolean",
    "recordsMatchCatalog": "boolean",
    "heartbeatRecent": "boolean"
  }
}`,
    notes: "If no full verification is recorded yet, the endpoint returns ok=false with a public-safe message.",
  },
  {
    path: "/api/collatz/export?format=json&limit=10",
    purpose: "Returns an exportable JSON sample from the verified public catalog.",
    parameters: "format: json. limit: optional positive integer, capped at 10000. offset: optional non-negative integer. order: asc or desc.",
    limits: "Exports are capped samples, not unlimited full-catalog dumps.",
    request: "GET /api/collatz/export?format=json&limit=10",
    response: `{
  "ok": "boolean",
  "generatedAt": "ISO timestamp",
  "highestVerifiedN": "number",
  "limit": "number",
  "offset": "number",
  "order": "desc",
  "count": "number",
  "data": [{ "n": "number", "steps_to_one": "number" }]
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
`,
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
            <div className="mt-3 flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                Public API
              </h1>
              <PanelHelp
                title="Public API"
                description="Provides structured access to the engine's public computational data so others can inspect, verify, or build from the recorded results."
                align="left"
              />
            </div>
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
            <div className="mt-4 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Export Samples
              </p>
              <PanelHelp
                title="Export Samples"
                description="Shows examples of the engine's recorded data in exportable formats for analysis, verification, and reuse."
                align="left"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Limited JSON and CSV exports are capped for public access.
              </p>
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
