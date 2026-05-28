import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin | The Collatz Engine",
  robots: { index: false, follow: false },
};

const sidebarSections = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Overview" }],
  },
  {
    label: "Monitoring",
    items: [
      { href: "/admin/monitoring/database", label: "Database Monitor" },
      { href: "/admin/monitoring/engine", label: "Engine Monitor" },
      { href: "/admin/monitoring/storage", label: "Storage Trends" },
      { href: "/admin/monitoring/r2", label: "Cloudflare R2" },
      { href: "/admin/monitoring/health", label: "Health & Errors" },
      { href: "/admin/monitoring/activity", label: "Activity Log" },
    ],
  },
  {
    label: "Engine Control",
    items: [
      { href: "/admin/engine/control", label: "Engine Control" },
      { href: "/admin/engine/config", label: "Runtime Config" },
      { href: "/admin/engine/modes", label: "Worker Modes" },
      { href: "/admin/engine/guardrails", label: "Guardrails" },
    ],
  },
  {
    label: "Storage & Archive",
    items: [
      { href: "/admin/archive/export", label: "Archive / Export" },
      { href: "/admin/archive/retention", label: "Retention / Cleanup" },
      { href: "/admin/archive/manifests", label: "Archive Manifests" },
      { href: "/admin/archive/summaries", label: "Range Summaries" },
    ],
  },
  {
    label: "Data Integrity",
    items: [
      { href: "/admin/integrity/checks", label: "Integrity Checks" },
      { href: "/admin/integrity/records", label: "Records" },
      { href: "/admin/integrity/milestones", label: "Milestones" },
      { href: "/admin/integrity/missing", label: "Missing Ranges" },
    ],
  },
  {
    label: "AI Observatory",
    items: [
      { href: "/admin/ai/notes", label: "AI Notes" },
      { href: "/admin/ai/drafts", label: "Drafts" },
      { href: "/admin/ai/published", label: "Published Reports" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/system/api", label: "API & Exports" },
      { href: "/admin/system/env", label: "Environment" },
      { href: "/admin/system/docs", label: "Documentation" },
      { href: "/admin/system/settings", label: "Settings" },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* ── Left sidebar ───────────────────────────────── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        {/* Sidebar header */}
        <div className="border-b border-slate-800 px-4 py-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/30">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 group-hover:text-teal-400 transition-colors">
                Collatz Engine
              </p>
              <p className="text-[10px] text-slate-500">Operations Console</p>
            </div>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {sidebarSections.map((section) => (
            <div key={section.label}>
              <p className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-600">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-slate-800 px-3 py-3 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Public site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-red-950 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
            {/* Mobile brand */}
            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-xs font-bold text-slate-100">Collatz Admin</span>
            </div>

            {/* Mobile nav pills */}
            <nav className="flex gap-1 overflow-x-auto lg:hidden">
              {sidebarSections.flatMap((s) => s.items).slice(0, 6).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-2.5 py-1 text-[10px] font-medium text-slate-400 whitespace-nowrap hover:bg-slate-800 hover:text-slate-100 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="hidden text-[10px] text-slate-500 sm:block">
                Phase 1
              </span>
              <form action={logoutAction} className="lg:hidden">
                <button
                  type="submit"
                  className="rounded-md px-2.5 py-1 text-[11px] text-slate-500 hover:text-red-400 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
