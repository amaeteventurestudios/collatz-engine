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
          <div className="mb-4 flex items-center justify-between">
            <p className="section-heading">Live Sequence Trace</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Demo — Live engine in Phase 2
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
                className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/60"
              >
                <p className="stat-label">{s.label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  {["Step", "Value", "Type", "Operation", "Result"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
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
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-400 dark:text-slate-500">
                      {row.step}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {row.value}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          row.type === "Odd"
                            ? "bg-violet-500/15 text-violet-600 dark:text-violet-400"
                            : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
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
                    <td className="px-4 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                      {row.op}
                    </td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-teal-600 dark:text-teal-400">
                      {row.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Above shows a static demo of n=27. Live computation engine arrives in Phase 2.
          </p>
        </div>
      </div>
    </section>
  );
}
