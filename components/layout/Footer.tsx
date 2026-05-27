import Link from "next/link";

const navLinks = [
  { href: "/#visualizer", label: "Visualizer" },
  { href: "/#records", label: "Records" },
  { href: "/#about", label: "About" },
  { href: "/#contribute", label: "Contribute" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Three-column grid */}
        <div className="grid grid-cols-1 gap-8 text-center sm:grid-cols-3 sm:text-left">
          {/* Brand col */}
          <div className="flex flex-col items-center sm:items-start">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              The Collatz Engine
            </p>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              A public visual observatory for exploring one of mathematics&apos; most famous
              unsolved problems.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                All systems operational
              </span>
            </div>
          </div>

          {/* Nav col */}
          <div className="flex flex-col items-center">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Navigate
            </p>
            <div className="flex flex-col items-center gap-1.5 sm:items-start">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs text-slate-500 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact col */}
          <div className="flex flex-col items-center sm:items-end">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Contact
            </p>
            <Link
              href="/#contribute"
              className="text-xs font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Use the Get Involved form
            </Link>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Observations, ideas, and issue reports
            </p>
            <div className="mt-3 flex items-center gap-4">
              <a
                href="https://github.com/amaeteventurestudios/collatz-engine"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 transition-colors hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              &copy; {new Date().getFullYear()} The Collatz Engine. Computational results from the running engine.
            </p>
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-600">
              This dashboard does not claim to prove the Collatz Conjecture.
            </p>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Created by{" "}
            <span className="font-medium text-teal-600 dark:text-teal-400">Amaete Umanah</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
