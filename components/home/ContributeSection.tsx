const getInvolvedLinks = [
  { label: "View on GitHub", icon: "⌥", href: "https://github.com/amaeteventurestudios/collatz-engine" },
  { label: "Submit an observation", icon: "✦", href: "#" },
  { label: "Share an idea", icon: "◈", href: "#" },
  { label: "Report an issue", icon: "⚑", href: "#" },
];

const socialLinks = [
  { label: "Twitter / X", href: "#" },
  { label: "YouTube", href: "#" },
  { label: "GitHub", href: "https://github.com/amaeteventurestudios/collatz-engine" },
];

export function ContributeSection() {
  return (
    <section id="contribute" className="scroll-mt-20 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl">
        {/* Section heading */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50 sm:text-3xl">
            Get Involved
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Support, share, and contribute to public mathematical exploration
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* About card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              About This Project
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              The Collatz Engine is an independent public exploration project created by Amaete
              Umanah. We do not claim to have solved the conjecture. We build tools, discover
              patterns, and share findings to support mathematical exploration.
            </p>
            <a
              href="#about"
              className="mt-3 block text-xs font-medium text-teal-600 transition-colors hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
            >
              Learn more about this project →
            </a>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Created by Amaete Umanah
              </span>
            </div>
          </div>

          {/* Get involved card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Get Involved
            </p>
            <ul className="space-y-1">
              {getInvolvedLinks.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-1 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-200/60 hover:text-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-teal-400"
                  >
                    <span className="w-4 text-center text-base leading-none text-slate-400">
                      {item.icon}
                    </span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Support This Project
            </p>
            <p className="mb-5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Running the engine, storing data, and keeping the lights on costs money. If you find
              this project valuable, please consider supporting it.
            </p>
            <a
              href="#"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-3 text-sm font-bold text-yellow-900 shadow-sm transition-colors hover:bg-yellow-300 sm:w-auto"
            >
              ☕ Support on Ko-fi
            </a>
          </div>
        </div>

        {/* Contact + social row */}
        <div className="mt-8 flex flex-col items-center gap-6 border-t border-slate-200 pt-8 dark:border-slate-800 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Contact
            </p>
            <p className="mt-1.5 text-sm text-slate-700 dark:text-slate-300">
              collatz.engine@gmail.com
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              Responses within 48 hours
            </p>
          </div>
          <div className="flex items-center gap-5">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="text-xs font-medium text-slate-400 transition-colors hover:text-teal-600 dark:text-slate-500 dark:hover:text-teal-400"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
