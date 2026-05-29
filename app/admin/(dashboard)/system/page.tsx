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

const API_ROUTES = [
  { path: "/api/collatz/state",           desc: "Current engine state" },
  { path: "/api/collatz/health",          desc: "Engine health check" },
  { path: "/api/collatz/latest",          desc: "Latest verified results" },
  { path: "/api/collatz/integrity",       desc: "Live integrity summary" },
  { path: "/api/collatz/integrity/latest", desc: "Latest full integrity run" },
  { path: "/api/collatz/near-escapes",    desc: "Near-escape candidates" },
  { path: "/api/collatz/records",         desc: "Engine records summary" },
  { path: "/api/collatz/export",          desc: "Data export (JSON/CSV)" },
];

const DOCS_LINKS = [
  { label: "Public API Reference",         href: "/docs/api" },
  { label: "Methodology & Math",            href: "/methodology" },
  { label: "System Status Page",            href: "/status" },
  { label: "Integrity Verification Guide",  href: "/admin/integrity" },
  { label: "Storage & Archive Guide",       href: "/admin/storage-archive" },
  { label: "Engine Control Guide",          href: "/admin/engine-control" },
];

export default function SystemPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">System</h1>
            <PanelHelp
              title="System"
              description="Safe system references — API routes, environment configuration status, documentation, and settings."
              operatorNote="This page never shows secret values. Only configuration status and public references."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">API & exports, environment status, documentation, settings</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: API & Exports */}
      <section>
        <SectionHeading id="api">
          API &amp; Exports
          <PanelHelp
            title="API & Exports"
            description="Public API endpoints available for querying verified Collatz computation data."
            details="All public API routes are rate-limited and return capped samples for public access. Full data export requires R2 configuration."
          />
        </SectionHeading>
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {["Route", "Description", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {API_ROUTES.map((route) => (
                  <tr key={route.path} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-teal-400">{route.path}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-400">{route.desc}</td>
                    <td className="px-4 py-2.5">
                      <a
                        href={route.path}
                        className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/collatz/export?format=json&limit=1000"
            className="rounded-lg border border-teal-700 bg-teal-950/20 px-4 py-2 text-[11px] font-medium text-teal-400 transition-colors hover:bg-teal-950"
          >
            Export JSON Sample (1,000 rows)
          </a>
          <a
            href="/api/collatz/export?format=csv&limit=1000"
            className="rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800"
          >
            Export CSV Sample (1,000 rows)
          </a>
          <Link
            href="/docs/api"
            className="rounded-lg border border-slate-700 px-4 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800"
          >
            Full API Docs →
          </Link>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Public samples are capped for open access. Bulk exports require R2 configuration.
        </p>
      </section>

      {/* Section 2: Environment */}
      <section>
        <SectionHeading id="environment">
          Environment
          <PanelHelp
            title="Environment"
            description="Shows which environment variables are configured. Values are never shown."
            operatorNote="Never add SUPABASE_SERVICE_ROLE_KEY or ADMIN_PASSWORD to NEXT_PUBLIC_ variables."
          />
        </SectionHeading>
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { key: "NEXT_PUBLIC_SUPABASE_URL",        configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
              { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",   configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
              { key: "SUPABASE_SERVICE_ROLE_KEY",       configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
              { key: "ADMIN_USERNAME",                  configured: !!process.env.ADMIN_USERNAME },
              { key: "ADMIN_PASSWORD",                  configured: !!process.env.ADMIN_PASSWORD },
              { key: "SESSION_SECRET",                  configured: !!process.env.SESSION_SECRET },
              { key: "CLOUDFLARE_R2_BUCKET",            configured: !!process.env.CLOUDFLARE_R2_BUCKET },
              { key: "CLOUDFLARE_R2_ACCOUNT_ID",        configured: !!process.env.CLOUDFLARE_R2_ACCOUNT_ID },
              { key: "CLOUDFLARE_R2_ENDPOINT",          configured: !!process.env.CLOUDFLARE_R2_ENDPOINT },
              { key: "SUPABASE_METRICS_ENABLED",        configured: process.env.SUPABASE_METRICS_ENABLED === "true" },
              { key: "NEXT_PUBLIC_SITE_URL",            configured: !!process.env.NEXT_PUBLIC_SITE_URL },
              { key: "NODE_ENV",                        configured: true, value: process.env.NODE_ENV ?? "—" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5">
                <span className="font-mono text-[10px] text-slate-400">{item.key}</span>
                <span className={`text-[10px] font-semibold ${item.configured ? "text-green-400" : "text-slate-600"}`}>
                  {"value" in item ? item.value : item.configured ? "Configured" : "Not set"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-slate-600">Secret values are never shown — only configured/not configured status.</p>
        </Card>
      </section>

      {/* Section 3: Documentation */}
      <section>
        <SectionHeading id="documentation">
          Documentation
          <PanelHelp
            title="Documentation"
            description="Links to runbooks, methodology, and operational guides."
          />
        </SectionHeading>
        <div className="grid gap-2 sm:grid-cols-2">
          {DOCS_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[11px] text-slate-400 transition-colors hover:border-teal-800 hover:text-teal-400"
            >
              {link.label}
              <span className="text-slate-600">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Section 4: Settings */}
      <section>
        <SectionHeading id="settings">Settings</SectionHeading>
        <Card>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-semibold text-slate-500">Settings — Coming Later</p>
            <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-slate-600">
              Safe admin settings (UI preferences, alert thresholds, notification config) will appear here in a future phase.
              Sensitive settings are managed via environment variables on the server.
            </p>
          </div>
        </Card>
      </section>

    </div>
  );
}
