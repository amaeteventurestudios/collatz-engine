import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "../actions";

export const metadata: Metadata = {
  title: "Admin Login | The Collatz Engine",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const hasError = params.error === "invalid";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 ring-1 ring-teal-500/30">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-teal-400"
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
          <h1 className="text-xl font-bold text-slate-100">Operations Console</h1>
          <p className="mt-1 text-xs text-slate-500">
            Restricted area — The Collatz Engine
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          {hasError && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-xs font-medium text-red-400">
                Invalid credentials. Please try again.
              </p>
            </div>
          )}

          <form action={loginAction} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-xs font-semibold text-slate-400"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                placeholder="admin"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-slate-400"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-500 active:bg-teal-700"
            >
              Sign In
            </button>
          </form>
        </div>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-xs text-slate-600 transition-colors hover:text-slate-400"
          >
            ← Return to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
