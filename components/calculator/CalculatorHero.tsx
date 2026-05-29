"use client";

import Image from "next/image";
import { useState } from "react";

const FEATURE_CHIPS = [
  { icon: "⚡", label: "Real-time computation" },
  { icon: "📋", label: "Detailed steps" },
  { icon: "📈", label: "Interactive graph" },
  { icon: "📊", label: "Metrics & analysis" },
  { icon: "⬇", label: "Export results" },
];

function HeroBgImage() {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <Image
      src="/images/collatz-hero.webp"
      alt=""
      fill
      preload
      sizes="(max-width: 768px) 0px, 55vw"
      className="object-cover object-right-top"
      onError={() => setMissing(true)}
    />
  );
}

export function CalculatorHero() {
  return (
    <section className="relative overflow-hidden bg-[#020617] py-10 pb-0">
      {/* Right-side image */}
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[55%] md:block">
        <HeroBgImage />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Eyebrow */}
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-teal-400">
            <span className="live-dot" />
            Real-time computation
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
          Collatz{" "}
          <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
            Conjecture Calculator
          </span>
        </h1>

        {/* Subheading */}
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Explore the famous 3n&nbsp;+&nbsp;1 problem. Enter any positive integer and
          visualize its trajectory.
        </p>

        {/* Feature chips */}
        <div className="mt-5 flex flex-wrap gap-2 pb-6">
          {FEATURE_CHIPS.map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-300 backdrop-blur-sm"
            >
              <span className="text-teal-400">{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
