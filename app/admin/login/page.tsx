import type { Metadata } from "next";
import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

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
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 ring-2 ring-teal-500/20">
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <AdminLoginForm hasError={hasError} />
        </div>

        {/* Footer links */}
        <div className="mt-5 flex items-center justify-center gap-4">
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
