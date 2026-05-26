"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white px-4 pb-16 pt-20 text-center dark:bg-slate-950 sm:pt-28">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-center"
      >
        <div className="h-[400px] w-[800px] rounded-full bg-teal-500/5 blur-3xl dark:bg-teal-500/8" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 flex items-center justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500 dark:border-green-400/30 dark:text-green-400">
            <span className="live-dot" />
            Engine Online
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-6xl"
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
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg"
        >
          A public visual observatory for exploring one of mathematics&apos; most famous unsolved
          problems. Continuously cataloging, visualizing, and analyzing Collatz trajectories.
        </motion.p>

        {/* Credibility note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-3 text-xs text-slate-400 dark:text-slate-500"
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
            className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-500 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-600 dark:bg-teal-500 dark:hover:bg-teal-400"
          >
            Explore the Data
          </Link>
          <Link
            href="/#about"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            About This Project
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
