export function ContributeSection() {
  return (
    <section id="contribute" className="scroll-mt-20 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* About the Engine */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              About The Collatz Engine
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              The Collatz Engine is an independent public exploration project created by Amaete
              Umanah. We do not claim to have solved the conjecture. We build tools, discover
              patterns, and share findings to support mathematical exploration.
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
              <a
                href="#about"
                className="font-medium text-teal-600 hover:underline dark:text-teal-400"
              >
                Learn more about this project →
              </a>
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
              <span className="live-dot" />
              Created by Amaete Umanah
            </p>
          </div>

          {/* Get Involved */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Get Involved
            </p>
            <ul className="space-y-2.5">
              {[
                { label: "View on GitHub", icon: "⌥" },
                { label: "Submit an observation", icon: "✦" },
                { label: "Share an idea", icon: "◈" },
                { label: "Report an issue", icon: "⚑" },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    href="#"
                    className="flex items-center gap-2 text-xs text-slate-600 transition-colors hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400"
                  >
                    <span className="text-slate-400">{item.icon}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Support This Project
            </p>
            <p className="mb-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Running the engine, storing data, and keeping the lights on costs money. If you find
              this project valuable, please consider supporting it.
            </p>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-xs font-bold text-yellow-900 shadow-sm transition-colors hover:bg-yellow-300"
            >
              ☕ Support on Ko-fi
            </a>
          </div>
        </div>

        {/* Contact row */}
        <div className="mt-6 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Contact
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              collatz.engine@gmail.com
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Responses within 48 hours
            </p>
          </div>
          <div className="mt-4 flex gap-4 sm:mt-0">
            {["Twitter/X", "YouTube", "GitHub"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-xs text-slate-400 transition-colors hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
