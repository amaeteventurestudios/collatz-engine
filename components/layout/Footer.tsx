import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              The Collatz Engine
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A public visual observatory for exploring one of mathematics&apos; most famous
              unsolved problems.
            </p>
          </div>

          {/* Links */}
          <div className="text-center">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Navigate
            </p>
            <div className="flex flex-col gap-1">
              {[
                { href: "/#visualizer", label: "Visualizer" },
                { href: "/#records", label: "Records" },
                { href: "/#about", label: "About" },
                { href: "/#contribute", label: "Contribute" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs text-slate-500 transition-colors hover:text-teal-500 dark:text-slate-400 dark:hover:text-teal-400"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="text-center sm:text-right">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Contact
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">collatz.engine@gmail.com</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Responses within 48 hours
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-slate-200 pt-6 dark:border-slate-800 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} The Collatz Engine. All computations verified.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Created by{" "}
            <span className="text-teal-500 dark:text-teal-400">Amaete Umanah</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
