"use client";

import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative min-h-[560px] overflow-hidden bg-slate-950 px-4 pb-12 pt-10 text-center sm:min-h-[600px] sm:pb-16 sm:pt-20">

      {/* ── Hero image (placed under content) ───────────────────────── */}
      {/* Fails gracefully — fallback is the dark slate-950 background above */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/collatz-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
          style={{ opacity: 0.35 }}
          onError={() => {/* silently ignore if image not yet present */}}
        />
        {/* gradient overlay — keeps text readable over the image */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/90" />
        {/* subtle teal radial glow behind the title */}
        <div className="absolute left-1/2 top-0 h-[500px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-teal-500/10 blur-3xl" />
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-3xl">

        {/* Live badge */}
        <div className="mb-6 flex items-center justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1.5 text-xs font-semibold text-green-400 backdrop-blur-sm">
            <span className="live-dot" />
            Engine Online
          </span>
        </div>

        {/* Main title */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          The{" "}
          <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Collatz Engine
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-5 max-w-xl px-2 text-base leading-relaxed text-slate-300 sm:px-0 sm:text-lg">
          A public autonomous observatory exploring one of mathematics&apos; most famous unsolved
          problems.
        </p>

        {/* Supporting description */}
        <p className="mx-auto mt-3 max-w-xl px-2 text-sm leading-relaxed text-slate-400 sm:px-0">
          The engine continuously catalogs, visualizes, and analyzes Collatz trajectories using
          persistent computation, transparent records, and live mathematical telemetry.
        </p>

        {/* Credibility note */}
        <p className="mx-auto mt-3 max-w-md px-4 text-xs leading-relaxed text-slate-500 sm:px-0">
          This project does not claim to prove the Collatz Conjecture. It is a public exploration
          and visualization system.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/#visualizer"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-500 px-8 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400 sm:h-11 sm:w-auto"
          >
            Explore the Data
          </Link>
          <Link
            href="/#about"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-8 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-600 hover:bg-slate-800/60 sm:h-11 sm:w-auto"
          >
            How the Engine Works
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="mt-10 flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">
            Scroll to explore
          </span>
          <svg
            className="h-4 w-4 animate-bounce text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </section>
  );
}
