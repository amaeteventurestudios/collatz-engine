import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getClient } from "@/lib/collatz/api";
import { getPublicHealthSnapshot } from "@/lib/collatz/health";
import type { PublicHealthSnapshot, WorkerHealthStatus } from "@/lib/collatz/health";
import { getIntegritySummary } from "@/lib/collatz/verify";
import type { IntegritySummary } from "@/lib/collatz/verify";
import {
  formatDurationApprox,
  formatLargeNumber,
  formatLargeNumberTitle,
  formatMilestone,
  formatMilestoneFull,
} from "@/lib/collatz/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status | The Collatz Engine",
  description:
    "Public operating health signals for The Collatz Engine and its verified computational catalog.",
};

const catalogMilestones = [
  1_000_000,
  10_000_000,
  100_000_000,
  1_000_000_000,
  10_000_000_000,
  100_000_000_000,
  1_000_000_000_000,
  10_000_000_000_000,
  100_000_000_000_000,
  1_000_000_000_000_000,
  10_000_000_000_000_000,
  100_000_000_000_000_000,
  1_000_000_000_000_000_000,
];

const statusConfig: Record<
  WorkerHealthStatus | "passed" | "warning" | "unavailable",
  { label: string; dot: string; text: string; border: string; bg: string }
> = {
  live: {
    label: "Live",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  delayed: {
    label: "Delayed",
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
  },
  stalled: {
    label: "Stalled",
    dot: "bg-orange-500",
    text: "text-orange-300",
    border: "border-orange-500/40",
    bg: "bg-orange-500/10",
  },
  stopped: {
    label: "Stopped",
    dot: "bg-slate-500",
    text: "text-slate-300",
    border: "border-slate-700",
    bg: "bg-slate-800/60",
  },
  error: {
    label: "Error",
    dot: "bg-red-500",
    text: "text-red-300",
    border: "border-red-500/40",
    bg: "bg-red-500/10",
  },
  passed: {
    label: "Passed",
    dot: "bg-emerald-400",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  warning: {
    label: "Review",
    dot: "bg-amber-400",
    text: "text-amber-300",
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
  },
  unavailable: {
    label: "Unavailable",
    dot: "bg-slate-500",
    text: "text-slate-400",
    border: "border-slate-700",
    bg: "bg-slate-800/60",
  },
};

async function loadStatus(): Promise<{
  health: PublicHealthSnapshot | null;
  liveIntegrity: IntegritySummary | null;
  error: string | null;
}> {
  try {
    const client = getClient();
    const [health, liveIntegrity] = await Promise.all([
      getPublicHealthSnapshot(client),
      getIntegritySummary(client).catch(() => null),
    ]);
    return { health, liveIntegrity, error: null };
  } catch {
    return {
      health: null,
      liveIntegrity: null,
      error: "Public operating health is temporarily unavailable.",
    };
  }
}

function fmtAge(seconds: number | null): string {
  if (seconds == null) return "No heartbeat recorded";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmtMs(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "-";
  if (ms < 1_000) return `${ms}ms`;
  return `${(ms / 1_000).toFixed(2)}s`;
}

function fmtRate(rate: number | null | undefined): string {
  if (!rate || rate <= 0) return "-";
  return `${rate.toFixed(1)}/sec`;
}

function nextMilestone(catalogSize: number): {
  target: number | null;
  remaining: number;
  eta: string;
} {
  const target = catalogMilestones.find((milestone) => catalogSize < milestone) ?? null;
  return {
    target,
    remaining: target ? Math.max(0, target - catalogSize) : 0,
    eta: "-",
  };
}

function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded border px-2.5 py-1 ${cfg.bg} ${cfg.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${cfg.text}`}>
        {cfg.label}
      </span>
    </span>
  );
}

function Metric({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub: string;
  title?: string;
}) {
  return (
    <div className="border-b border-slate-800 px-4 py-4 sm:border-r">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-slate-100" title={title}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
    </div>
  );
}

export default async function StatusPage() {
  const { health, liveIntegrity, error } = await loadStatus();
  const catalogSize = health?.numbersCataloged ?? liveIntegrity?.numbersCataloged ?? 0;
  const milestone = nextMilestone(catalogSize);
  const eta =
    milestone.target && health?.numbersPerSecond
      ? formatDurationApprox(milestone.remaining / health.numbersPerSecond)
      : "-";
  const liveCheckStatus = liveIntegrity ? (liveIntegrity.ok ? "passed" : "warning") : "unavailable";

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <Header />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-400">
                Public System Status
              </p>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
                Operational Health
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                This page reports the operating health of the public Collatz Engine and its
                verified catalog. It does not claim to prove the Collatz Conjecture.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="rounded border border-slate-300 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              >
                Dashboard
              </Link>
              <a
                href="/api/collatz/health"
                className="rounded border border-teal-500/40 bg-teal-500/10 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-700 transition-colors hover:bg-teal-500/15 dark:text-teal-300"
              >
                Health API
              </a>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {error}
            </div>
          )}

          <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Engine Status
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {health?.message ?? "Engine health is unavailable."}
                </p>
              </div>
              <StatusBadge status={health?.status ?? "unavailable"} />
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Current Catalog Size"
                value={formatLargeNumber(catalogSize)}
                title={formatLargeNumberTitle(catalogSize)}
                sub="Sequentially cataloged integers"
              />
              <Metric
                label="Heartbeat Freshness"
                value={fmtAge(health?.heartbeatAgeSeconds ?? null)}
                sub="Last observed worker signal"
              />
              <Metric
                label="Last Batch Throughput"
                value={fmtRate(health?.numbersPerSecond)}
                sub={`Duration ${fmtMs(health?.lastBatchDurationMs)}`}
              />
              <Metric
                label="Current Status"
                value={(health?.currentStatus ?? "-").toUpperCase()}
                sub={`Last run ${fmtDate(health?.lastRunAt)}`}
              />
            </div>
          </section>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Full Catalog Verification
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Most recent persisted full scan.
                  </p>
                </div>
                <StatusBadge
                  status={
                    health?.lastFullIntegrityRun
                      ? health.lastFullIntegrityRun.status === "passed"
                        ? "passed"
                        : "warning"
                      : "unavailable"
                  }
                />
              </div>
              {health?.lastFullIntegrityRun ? (
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Last Checked
                    </dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {fmtDate(health.lastFullIntegrityRun.checkedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Highest Verified n
                    </dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {health.lastFullIntegrityRun.highestVerifiedN != null
                        ? formatLargeNumber(health.lastFullIntegrityRun.highestVerifiedN)
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Duplicates / Missing Ranges
                    </dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {health.lastFullIntegrityRun.duplicateCount ?? "-"} /{" "}
                      {health.lastFullIntegrityRun.missingRangeCount ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                      Duration
                    </dt>
                    <dd className="mt-1 font-mono text-slate-200">
                      {fmtMs(health.lastFullIntegrityRun.durationMs)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-5 rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                  No full verification run recorded yet.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Live Bounded Check
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Recent-window integrity check for dashboard health.
                  </p>
                </div>
                <StatusBadge status={liveCheckStatus} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Checked At
                  </dt>
                  <dd className="mt-1 font-mono text-slate-200">
                    {fmtDate(liveIntegrity?.checkedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Scope
                  </dt>
                  <dd className="mt-1 font-mono text-slate-200">
                    {liveIntegrity ? `${liveIntegrity.scopeSize.toLocaleString("en-US")} recent entries` : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Duplicate / Gap Checks
                  </dt>
                  <dd className="mt-1 font-mono text-slate-200">
                    {liveIntegrity
                      ? `${liveIntegrity.checks.duplicates.count} / ${liveIntegrity.checks.missingRanges.count}`
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
                    Worker Heartbeat
                  </dt>
                  <dd className="mt-1 font-mono text-slate-200">
                    {fmtAge(liveIntegrity?.checks.heartbeat.ageSeconds ?? null)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Current Milestone Target
              </p>
              <p
                className="mt-2 font-mono text-2xl font-bold text-slate-100"
                title={milestone.target ? formatMilestoneFull(milestone.target) : undefined}
              >
                {milestone.target ? `${formatMilestone(milestone.target)} cataloged` : "Milestone ladder complete"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {milestone.target
                  ? `${formatLargeNumber(milestone.remaining)} numbers remaining at current catalog size.`
                  : "The listed milestone ladder can be extended as the catalog grows."}
              </p>
              <p className="mt-2 font-mono text-xs text-slate-500">ETA at current throughput: {eta}</p>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-950 p-5">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Latest Operational Events
              </p>
              <div className="mt-4 space-y-3">
                {health?.latestEvents && health.latestEvents.length > 0 ? (
                  health.latestEvents.map((event) => (
                    <div key={`${event.eventType}-${event.observedAt}`} className="border-l border-slate-700 pl-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={
                            event.severity === "critical"
                              ? "error"
                              : event.severity === "warning"
                                ? "warning"
                                : "passed"
                          }
                        />
                        <span className="font-mono text-[10px] text-slate-500">
                          {fmtDate(event.observedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">{event.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded border border-slate-800 bg-slate-900/40 px-4 py-3 text-sm text-slate-400">
                    No operational events recorded yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
