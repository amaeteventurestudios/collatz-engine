"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/#visualizer", label: "Visualizer" },
  { href: "/#records", label: "Records" },
  { href: "/#research", label: "Research Log" },
  { href: "/#about", label: "About" },
  { href: "/#contribute", label: "Contribute" },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      {/* ── Desktop bar ─────────────────────────────────── */}
      <div className="mx-auto hidden max-w-7xl items-center justify-between px-6 py-3 md:flex">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <EngineIcon />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            The Collatz Engine
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ThemeButton onClick={toggleTheme} />
      </div>

      {/* ── Mobile bar (3-col grid so title is truly centred) ── */}
      <div className="grid grid-cols-3 items-center px-4 py-3 md:hidden">
        {/* Col 1 – hamburger */}
        <div className="flex items-center">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Col 2 – brand centred */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          <EngineIcon size="sm" />
          <span>The Collatz Engine</span>
        </Link>

        {/* Col 3 – theme toggle (right-aligned) */}
        <div className="flex items-center justify-end">
          <ThemeButton onClick={toggleTheme} />
        </div>
      </div>

      {/* ── Mobile dropdown nav ─────────────────────────── */}
      {menuOpen && (
        <nav
          className="border-t border-slate-200 bg-white px-4 pb-5 pt-2 dark:border-slate-800 dark:bg-slate-950 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function EngineIcon({ size = "md" }: { size?: "sm" | "md" }) {
  const dim = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const icon = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div
      className={`flex ${dim} shrink-0 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/30`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${icon} text-teal-500`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  );
}

function ThemeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Toggle theme"
      className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      <Sun className="h-4 w-4 dark:hidden" />
      <Moon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
