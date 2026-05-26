import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Login — The Collatz Engine",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 ring-1 ring-teal-500/30">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 text-teal-500"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">Admin Access</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The Collatz Engine — restricted area
          </p>
        </div>

        {/* Card */}
        <div className="engine-card">
          <div className="mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
              Phase 1 placeholder — authentication not yet implemented.
            </p>
          </div>

          <form className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                disabled
                placeholder="admin@example.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:placeholder-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                disabled
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:placeholder-slate-500"
              />
            </div>

            <button
              type="button"
              disabled
              className="w-full rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
            >
              Sign In
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/admin"
              className="text-xs text-teal-600 hover:underline dark:text-teal-400"
            >
              Skip to admin shell (Phase 1 only) →
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            ← Return to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
