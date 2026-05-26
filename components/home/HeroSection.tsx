"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-10 pt-10 text-center dark:bg-slate-950 sm:pb-14 sm:pt-20">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden"
      >
        <div className="mt-[-100px] h-[500px] w-full max-w-3xl rounded-full bg-teal-500/5 blur-3xl dark:bg-teal-500/8" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3.5 py-1.5 text-xs font-semibold text-green-600 dark:border-green-400/30 dark:text-green-400">
            <span className="live-dot" />
            Engine Online
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl"
        >
          The{" "}
          <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
            Collatz Engine
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-5 max-w-xl px-2 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg sm:px-0"
        >
          A public visual observatory for exploring one of mathematics&apos; most famous unsolved
          problems. Continuously cataloging, visualizing, and analyzing Collatz trajectories.
        </motion.p>

        {/* Credibility note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mx-auto mt-3 max-w-md px-4 text-xs leading-relaxed text-slate-400 dark:text-slate-500 sm:px-0"
        >
          This project does not claim to prove the Collatz Conjecture. It is a public exploration
          and visualization system.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/#visualizer"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-500 px-8 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 sm:h-11 sm:w-auto dark:hover:bg-teal-400"
          >
            Explore the Data
          </Link>
          <Link
            href="/#about"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 px-8 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:h-11 sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            About This Project
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Scroll to explore
          </span>
          <svg
            className="h-4 w-4 animate-bounce text-slate-300 dark:text-slate-700"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
