import Link from "next/link";

const navigateLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/#visualizer", label: "Visualizer" },
  { href: "/visual-studio", label: "Visual Studio" },
  { href: "/#records", label: "Records" },
  { href: "/observatory", label: "Observatory" },
  { href: "/#about", label: "About" },
  { href: "/#contribute", label: "Contribute" },
];

const resourceLinks = [
  { href: "/status", label: "Status" },
  { href: "/docs/api", label: "API Docs" },
  { href: "/methodology", label: "Methodology" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Four-column grid ───────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 ring-1 ring-teal-500/30">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-100">The Collatz Engine</span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-400">
              A public autonomous observatory exploring one of mathematics&apos; most famous
              unsolved problems.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-slate-500">All systems operational</span>
            </div>
          </div>

          {/* Navigate */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Navigate
            </p>
            <ul className="space-y-2.5">
              {navigateLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-slate-400 transition-colors hover:text-teal-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Resources
            </p>
            <ul className="space-y-2.5">
              {resourceLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-xs text-slate-400 transition-colors hover:text-teal-400"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Get Involved */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Get Involved
            </p>
            <Link
              href="/#contribute"
              className="text-xs font-medium text-teal-400 transition-colors hover:text-teal-300"
            >
              Use the Get Involved form
            </Link>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Observations, ideas, and issue reports welcome.
            </p>
          </div>
        </div>

        {/* ── Bottom bar ─────────────────────────────────────────── */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-slate-800 pt-8 sm:flex-row sm:justify-between">
          <div>
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} The Collatz Engine.
              Computational results from the running engine.
            </p>
            <p className="mt-1 text-[11px] text-slate-600">
              This project does not claim to prove the Collatz Conjecture.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Created by{" "}
            <a
              href="https://www.linkedin.com/in/amaeteumanah/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-400 transition-colors hover:text-teal-300"
            >
              Amaete Umanah
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
