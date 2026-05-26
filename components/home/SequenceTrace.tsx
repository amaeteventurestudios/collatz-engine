const demoRows = [
  { step: "001", value: "27", type: "Odd", op: "3n + 1", result: "82" },
  { step: "002", value: "82", type: "Even", op: "n / 2", result: "41" },
  { step: "003", value: "41", type: "Odd", op: "3n + 1", result: "124" },
  { step: "004", value: "124", type: "Even", op: "n / 2", result: "62" },
  { step: "005", value: "62", type: "Even", op: "n / 2", result: "31" },
  { step: "006", value: "31", type: "Odd", op: "3n + 1", result: "94" },
  { step: "007", value: "94", type: "Even", op: "n / 2", result: "47" },
];

export function SequenceTrace() {
  return (
    <section className="px-4 pb-10 sm:pb-14">
      <div className="mx-auto max-w-7xl">
        <div className="engine-card">
          {/* Header */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="section-heading">Live Sequence Trace</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Static demo — live engine in Phase 3
            </span>
          </div>

          {/* Stats row */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Start Number", value: "27" },
              { label: "Current Value", value: "—" },
              { label: "Step", value: "—" },
              { label: "Peak So Far", value: "—" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/60"
              >
                <p className="stat-label">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Current rule callout */}
          <div className="mb-5 flex flex-col items-start gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 dark:border-sky-500/20 dark:bg-sky-500/5 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                Current Rule
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                62
              </span>
              <span className="text-slate-500 dark:text-slate-400">is even →</span>
              <span className="font-mono text-base font-bold text-teal-600 dark:text-teal-400">
                62 ÷ 2 = 31
              </span>
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                Even rule: n / 2
              </span>
            </div>
          </div>

          {/* Table with horizontal scroll on narrow screens */}
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <div className="min-w-[500px] sm:min-w-0">
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                      {["Step", "Value", "Type", "Operation", "Result"].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-4 py-3 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {demoRows.map((row) => (
                      <tr
                        key={row.step}
                        className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3 font-mono text-slate-400 dark:text-slate-500">
                          {row.step}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {row.value}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              row.type === "Odd"
                                ? "bg-violet-500/15 text-violet-700 dark:text-violet-400"
                                : "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.type === "Odd" ? "bg-violet-500" : "bg-sky-500"
                              }`}
                            />
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                          {row.op}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-600 dark:text-teal-400">
                          {row.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Static demo using n=27. The live computation engine arrives in Phase 3.
          </p>
        </div>
      </div>
    </section>
  );
}
