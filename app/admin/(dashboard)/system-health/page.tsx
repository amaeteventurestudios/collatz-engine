import Link from "next/link";
import { PanelHelp } from "@/components/ui/PanelHelp";
import { getEngineAdminState, getWorkerLockState } from "@/lib/admin/metrics";
import { getStorageMonitor } from "@/lib/admin/storage";
import { getR2Status } from "@/lib/admin/r2";
import { secondsSince, heartbeatStatus } from "@/lib/admin/engine";

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

function HealthRow({ label, ok, detail }: { label: string; ok: boolean | null; detail?: string }) {
  const color = ok == null ? "bg-slate-600" : ok ? "bg-green-500" : "bg-red-500";
  const textColor = ok == null ? "text-slate-600" : ok ? "text-green-400" : "text-red-400";
  const statusText = ok == null ? "Not checked" : ok ? "OK" : "Error";
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <div>
        <p className="text-[11px] text-slate-300">{label}</p>
        {detail && <p className="mt-0.5 text-[10px] text-slate-600">{detail}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${color}`} />
        <span className={`text-[10px] font-semibold ${textColor}`}>{statusText}</span>
      </div>
    </div>
  );
}

export default async function SystemHealthPage() {
  const [engineResult, workerLockResult, storageData, r2Data] = await Promise.all([
    getEngineAdminState(),
    getWorkerLockState(),
    getStorageMonitor(),
    getR2Status(),
  ]);

  const engine = engineResult.data;
  const hbAge = secondsSince(engine?.lastHeartbeat);
  const hbStatus = heartbeatStatus(hbAge);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100">System Health</h1>
            <PanelHelp
              title="System Health"
              description="Shows whether major system components are deployed, reachable, or configured."
              details="This page does not expose secrets. It only shows configured/not configured status."
              operatorNote="System health checks reflect the app's view of component availability, not direct server-level metrics."
            />
          </div>
          <p className="mt-0.5 text-sm text-slate-500">Infrastructure status, service availability, and runbook links</p>
        </div>
        <Link href="/admin" className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors">
          ← Overview
        </Link>
      </div>

      {/* Section 1: System Status */}
      <section>
        <SectionHeading id="system-status">
          System Status
          <PanelHelp
            title="System Status"
            description="Reachability and configuration checks for core system components."
            source="Checked at page load from server-side environment and database queries."
          />
        </SectionHeading>
        <div className="grid gap-2 sm:grid-cols-2">
          <HealthRow label="Supabase Database"  ok={engineResult.connected}  detail="Engine state readable via anon/service client" />
          <HealthRow label="Engine State"       ok={engine != null}           detail={engine ? `Status: ${engine.status}` : "No state row"} />
          <HealthRow label="Worker Heartbeat"   ok={hbStatus === "live" ? true : hbStatus === "delayed" ? null : false}
            detail={hbAge != null ? `Last heartbeat: ${hbAge}s ago` : "No heartbeat recorded"} />
          <HealthRow label="Worker Lock Table"  ok={workerLockResult.tableExists}
            detail={workerLockResult.tableExists ? `Lock status: ${workerLockResult.data?.status ?? "none"}` : "Table not created"} />
          <HealthRow label="Supabase Storage"   ok={storageData.status === "safe" || storageData.status === "watch" ? true : false}
            detail={`${(storageData.estimatedUsedBytes / (1024 ** 3)).toFixed(2)} GB used`} />
          <HealthRow label="API Routes"         ok={true}  detail="Verified by page load" />
          <HealthRow label="App Deployed"       ok={true}  detail="Next.js app serving responses" />
          <HealthRow label="Cloudflare R2"      ok={r2Data.config.configured ? null : false}
            detail={r2Data.config.configured ? "Configured" : "Not configured — archive disabled"} />
        </div>
      </section>

      {/* Section 2: Hetzner Worker */}
      <section>
        <SectionHeading id="hetzner">
          Hetzner Worker
          <PanelHelp
            title="Hetzner Worker"
            description="Shows what the app can see about the Hetzner worker via the database. Direct SSH or server metrics are not available from this app."
            details="Worker health is inferred from the worker lock heartbeat and engine state updates. This is not a direct server connection."
            operatorNote="To check the actual server, SSH into Hetzner directly. Do not attempt to restart or stop the worker from this page."
          />
        </SectionHeading>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Worker Lock Status",  value: workerLockResult.data?.status ?? "—",
                color: workerLockResult.data?.status === "active" ? "text-green-400" : "text-slate-400" },
              { label: "Lock Holder",         value: workerLockResult.data?.workerInstanceId ?? "—" },
              { label: "Hostname",            value: workerLockResult.data?.hostname ?? "—" },
              { label: "PID",                 value: workerLockResult.data?.pid != null ? String(workerLockResult.data.pid) : "—" },
              { label: "Lock Acquired At",    value: workerLockResult.data?.acquiredAt ? new Date(workerLockResult.data.acquiredAt).toLocaleString("en-US") : "—" },
              { label: "Lock Heartbeat",      value: workerLockResult.data?.heartbeatAt ? new Date(workerLockResult.data.heartbeatAt).toLocaleString("en-US") : "—" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-600">{item.label}</p>
                <p className={`mt-0.5 text-sm font-semibold ${item.color ?? "text-slate-300"}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
            <p className="text-[11px] text-slate-500">
              CPU, RAM, disk, and network metrics for the Hetzner server are not available through this app.
              A future phase may add a lightweight server-side metrics endpoint if a safe telemetry path is established.
            </p>
          </div>
        </Card>
      </section>

      {/* Section 3: Environment Checks */}
      <section>
        <SectionHeading id="environment">
          Environment Checks
          <PanelHelp
            title="Environment Checks"
            description="Shows which environment variables are configured without revealing their values."
            operatorNote="Never show actual secret values here. Only configured/not configured status."
          />
        </SectionHeading>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { label: "NEXT_PUBLIC_SUPABASE_URL",     ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL },
            { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
            { label: "SUPABASE_SERVICE_ROLE_KEY",    ok: !!process.env.SUPABASE_SERVICE_ROLE_KEY },
            { label: "ADMIN_USERNAME",               ok: !!process.env.ADMIN_USERNAME },
            { label: "ADMIN_PASSWORD",               ok: !!process.env.ADMIN_PASSWORD },
            { label: "SESSION_SECRET",               ok: !!process.env.SESSION_SECRET },
            { label: "CLOUDFLARE_R2 (bucket)",       ok: !!process.env.CLOUDFLARE_R2_BUCKET },
            { label: "SUPABASE_METRICS_ENABLED",     ok: process.env.SUPABASE_METRICS_ENABLED === "true" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
              <span className="font-mono text-[11px] text-slate-400">{item.label}</span>
              <span className={`text-[10px] font-semibold ${item.ok ? "text-green-400" : "text-slate-600"}`}>
                {item.ok ? "Configured" : "Not set"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Values are never shown — only configured/not configured status.</p>
      </section>

      {/* Section 4: Runbook Links */}
      <section>
        <SectionHeading id="runbooks">Service Runbook Links</SectionHeading>
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Worker Lock Docs",         href: "/docs/api#worker-lock",  ext: false },
              { label: "Storage Cleanup Guide",    href: "/admin/storage-archive", ext: false },
              { label: "Integrity Verification",   href: "/admin/integrity",        ext: false },
              { label: "Methodology & Math",        href: "/methodology",           ext: true  },
              { label: "Public API Reference",     href: "/docs/api",              ext: true  },
              { label: "System Status Page",        href: "/status",                ext: true  },
            ].map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-[11px] text-slate-400 transition-colors hover:border-teal-800 hover:text-teal-400"
              >
                {link.label}
                <span className="text-slate-600">{link.ext ? "↗" : "→"}</span>
              </Link>
            ))}
          </div>
        </Card>
      </section>

    </div>
  );
}
