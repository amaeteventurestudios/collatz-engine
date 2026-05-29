"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/admin/actions";

// ─── Password generator ───────────────────────────────────────────────────────

const CHARSET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";

function generateSecurePassword(length = 20): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

// ─── Submit button (reads pending from form context) ─────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-900/40 transition-all hover:from-teal-500 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          Signing in…
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Sign In
        </>
      )}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  hasError: boolean;
}

// ─── Main form component ──────────────────────────────────────────────────────

export function AdminLoginForm({ hasError }: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [generatedPw, setGeneratedPw] = useState<string | null>(null);
  const [pwCopied, setPwCopied] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleGeneratePassword() {
    const pw = generateSecurePassword(20);
    setGeneratedPw(pw);
    setPwCopied(false);
  }

  function handleCopyGenerated() {
    if (!generatedPw) return;
    navigator.clipboard.writeText(generatedPw).then(() => {
      setPwCopied(true);
      setTimeout(() => setPwCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {hasError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
        >
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs font-medium text-red-400">
            Invalid credentials. Please check your username and password.
          </p>
        </div>
      )}

      {/* Login form */}
      <form action={loginAction} className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-slate-400">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            autoComplete="username"
            autoFocus
            placeholder="admin"
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-slate-400">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              className="text-[10px] text-slate-600 transition-colors hover:text-slate-400"
            >
              Forgot credentials?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              ref={passwordRef}
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-3.5 pr-10 text-sm text-slate-100 placeholder-slate-600 transition-colors focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <SubmitButton />
      </form>

      {/* Forgot credentials panel */}
      {showForgot && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/60 p-4 text-xs text-slate-400 space-y-2">
          <p className="font-semibold text-slate-300">Forgot your credentials?</p>
          <p className="leading-relaxed text-slate-500">
            Admin credentials are set via environment variables{" "}
            <code className="rounded bg-slate-700 px-1 py-0.5 font-mono text-[10px] text-slate-300">
              ADMIN_USERNAME
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-700 px-1 py-0.5 font-mono text-[10px] text-slate-300">
              ADMIN_PASSWORD
            </code>
            . Update them on your server or hosting platform to reset access.
          </p>
          {/* TODO: Wire up email-based reset if a Supabase Auth admin account is added later */}

          {/* Password generator utility */}
          <div className="border-t border-slate-700/50 pt-3">
            <p className="mb-2 text-[11px] font-semibold text-slate-400">Generate a new secure password</p>
            <p className="mb-2 text-[10px] leading-relaxed text-slate-600">
              Use this to create a strong replacement password for your{" "}
              <code className="font-mono text-[10px] text-slate-500">ADMIN_PASSWORD</code>{" "}
              environment variable. This does not change your current password.
            </p>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Generate secure password
            </button>

            {generatedPw && (
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-teal-300">
                  {generatedPw}
                </code>
                <button
                  type="button"
                  onClick={handleCopyGenerated}
                  aria-label="Copy generated password"
                  className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-[11px] font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
                >
                  {pwCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
