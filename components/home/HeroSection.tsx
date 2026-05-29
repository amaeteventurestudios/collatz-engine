"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#020617] min-h-[720px]">

      {/* ── Right-side trajectory field image ─────────────────────────── */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[62%]">
        <HeroImage />
      </div>

      {/* ── Left-to-right gradient so text area stays dark ───────────── */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/95 to-[#020617]/15 md:to-[#020617]/10" />
      {/* ── Mobile overlay — darken image behind text ────────────────── */}
      <div className="absolute inset-0 bg-[#020617]/75 md:hidden" />
      {/* ── Bottom fade into next section ────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-[#020617]" />

      {/* ── Hero content ─────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto flex min-h-[720px] max-w-7xl items-center px-6 py-16 md:py-0">
        <div className="max-w-[520px] w-full md:w-[45%]">

          {/* Eyebrow */}
          <div className="mb-5 flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-teal-400" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4l3 3" />
            </svg>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-teal-400 uppercase">
              Autonomous Mathematical Observatory
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-[4rem]">
            The{" "}
            <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
              Collatz Engine
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mt-5 text-base leading-relaxed text-slate-300 sm:text-lg">
            Exploring one of mathematics&apos; most famous unsolved problems.
          </p>

          {/* Supporting line */}
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            The engine continuously catalogs, visualizes, and analyzes Collatz
            trajectories using persistent computation, transparent records, and
            live mathematical telemetry.
          </p>

          {/* Status row */}
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="live-dot" />
              <span className="text-green-400">Engine Online</span>
            </span>
            <span className="text-slate-600">|</span>
            <span>All Systems Operational</span>
            <span className="text-slate-600">|</span>
            <span>Data Is Live</span>
          </div>

          {/* CTAs */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#visualizer"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-teal-500 px-7 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition-colors hover:bg-teal-400"
            >
              Explore the Data →
            </Link>
            <Link
              href="/#about"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/60 px-7 text-sm font-semibold text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-500 hover:bg-slate-800/60"
            >
              How the Engine Works →
            </Link>
          </div>

          {/* Disclaimer card */}
          <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <p className="text-xs leading-relaxed text-slate-500">
              This project does not claim to prove the Collatz Conjecture.{" "}
              It is a public exploration and visualization system.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

function HeroImage() {
  const [missing, setMissing] = useState(false);

  if (missing) return null;

  return (
    <Image
      src="/images/collatz-hero.webp"
      alt="Collatz trajectory field converging toward one"
      fill
      preload
      sizes="(max-width: 768px) 100vw, 62vw"
      className="object-cover object-right"
      onError={() => setMissing(true)}
    />
  );
}
