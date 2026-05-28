import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
        ◌
      </div>
      <h2 className="mb-2 text-lg font-bold text-slate-100">Not built yet</h2>
      <p className="mb-6 max-w-sm text-sm text-slate-500">
        This section is planned for a future phase. The admin foundation is Phase 1 — monitoring
        panels, controls, and automation arrive in Phase 2/3.
      </p>
      <Link
        href="/admin"
        className="rounded-xl bg-teal-600/20 px-4 py-2 text-sm font-medium text-teal-400 ring-1 ring-teal-600/30 hover:bg-teal-600/30 transition-colors"
      >
        ← Back to Overview
      </Link>
    </div>
  );
}
