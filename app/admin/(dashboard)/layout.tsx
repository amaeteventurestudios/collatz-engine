import type { ReactNode } from "react";
import Link from "next/link";
import { logoutAction } from "../actions";

const sidebarSections = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Overview" }],
  },
  {
    label: "Observatory",
    items: [
      { href: "/admin/ai-observatory", label: "AI Observatory" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/engine-control", label: "Engine Control" },
      { href: "/admin/activity-log",   label: "Activity Log" },
      { href: "/admin/integrity",      label: "Integrity Checks" },
      { href: "/admin/records",        label: "Records" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { href: "/admin/database-monitor", label: "Database Monitor" },
      { href: "/admin/storage-archive",  label: "Storage & Archive" },
      { href: "/admin/system-health",    label: "System Health" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/system", label: "System" },
    ],
  },
];

// Public site shortcuts shown in the top utility bar
const publicShortcuts = [
  { href: "/", label: "Dashboard" },
  { href: "/calculator", label: "Calculator" },
  { href: "/visual-studio", label: "Visual Studio" },
  { href: "/observatory", label: "Observatory" },
  { href: "/status", label: "Status" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* ── Left sidebar (desktop only) ───────────────────── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
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
              <p className="text-xs font-bold text-slate-100 transition-colors group-hover:text-teal-400">
                Collatz Engine
              </p>
              <p className="text-[10px] text-slate-500">Operations Console</p>
            </div>
          </Link>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
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
        <div className="space-y-1 border-t border-slate-800 px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-300"
          >
            ← Public site
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] text-slate-500 transition-colors hover:bg-red-950 hover:text-red-400"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main content area ──────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* ── Top utility bar ──────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-4 py-2 sm:px-5">

            {/* Mobile brand */}
            <Link href="/admin" className="flex shrink-0 items-center gap-2 lg:hidden">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-500/10 ring-1 ring-teal-500/30">
                <svg viewBox="0 0 24 24" className="h-3 w-3 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-100">Collatz Admin</span>
            </Link>

            {/* Divider (desktop only) */}
            <span className="hidden h-4 w-px bg-slate-700 lg:block" />

            {/* Public site shortcuts (desktop) */}
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Public site shortcuts">
              <Link
                href="/"
                className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                View Public Site
              </Link>
              <span className="h-3 w-px bg-slate-800" />
              {publicShortcuts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="rounded px-2.5 py-1 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                  {s.label}
                </Link>
              ))}
            </nav>

            {/* Mobile scrollable shortcuts */}
            <nav
              className="flex flex-1 gap-1 overflow-x-auto lg:hidden"
              aria-label="Quick navigation"
            >
              <Link href="/admin" className="shrink-0 rounded px-2.5 py-1 text-[10px] font-semibold text-teal-400 transition-colors hover:bg-slate-800">
                Admin
              </Link>
              {sidebarSections.flatMap((s) => s.items).slice(0, 5).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 whitespace-nowrap rounded px-2.5 py-1 text-[10px] font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right side: status + sign out */}
            <div className="ml-auto flex shrink-0 items-center gap-3">
              <span className="hidden items-center gap-1.5 text-[10px] text-slate-600 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Operations Console
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-700/50 px-3 py-1 text-[10px] font-medium text-slate-500 transition-colors hover:border-red-800 hover:bg-red-950/50 hover:text-red-400"
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
