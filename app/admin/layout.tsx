import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin | The Collatz Engine",
  robots: { index: false, follow: false },
};

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: "⊞" },
  { href: "/admin", label: "Engine Controls", icon: "⚙" },
  { href: "/admin", label: "Observations for Review", icon: "✦" },
  { href: "/admin", label: "Records Manager", icon: "▲" },
  { href: "/admin", label: "Near-Escape Manager", icon: "⚑" },
  { href: "/admin", label: "Submission Inbox", icon: "✉" },
  { href: "/admin", label: "Site Settings", icon: "◈" },
  { href: "/admin", label: "Audit Log", icon: "≡" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      {/* ── Top bar ────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="shrink-0 text-xs text-slate-500 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
            >
              ← Public site
            </Link>
            <span className="hidden text-slate-300 dark:text-slate-700 sm:inline">|</span>
            <span className="hidden text-sm font-semibold text-slate-900 dark:text-slate-100 sm:inline">
              Collatz Engine Admin
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              <span className="hidden sm:inline">Phase 2:</span> Placeholder
            </span>
          </div>
        </div>
      </header>

      {/* ── Mobile horizontal tab nav (hidden on lg+) ── */}
      <nav
        aria-label="Admin navigation"
        className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden"
      >
        <div className="flex gap-0.5 overflow-x-auto px-3 py-2">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 whitespace-nowrap transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Body ───────────────────────────────────────── */}
      <div className="flex flex-1">
        {/* Sidebar — desktop only */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
          <nav className="p-3" aria-label="Admin sidebar">
            {sidebarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <span className="text-sm">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
