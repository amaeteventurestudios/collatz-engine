"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

interface GlowingInfoIconProps {
  tooltip: string;
  align?: "left" | "right" | "center";
  size?: "sm" | "md";
}

const alignClasses = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
};

export function GlowingInfoIcon({ tooltip, align = "center", size = "sm" }: GlowingInfoIconProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function closeKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeKey);
    };
  }, [open]);

  const btnSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <span
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={tooltip}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        className={`inline-flex cursor-pointer items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300/70 ${btnSize} ${
          open
            ? "border-teal-300/60 bg-teal-400/10 text-teal-300 shadow-[0_0_14px_rgba(20,184,166,0.3)]"
            : "border-teal-400/20 bg-slate-950/40 text-slate-500 hover:border-teal-300/50 hover:bg-teal-400/10 hover:text-teal-300 hover:shadow-[0_0_12px_rgba(20,184,166,0.25)]"
        }`}
      >
        <Info className={iconSize} aria-hidden="true" />
      </button>

      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={`pointer-events-none absolute top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-teal-400/20 bg-slate-950 px-3 py-2.5 text-left shadow-xl shadow-teal-950/40 transition-all duration-150 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-20 max-sm:mt-0 max-sm:w-auto max-sm:translate-x-0 ${alignClasses[align]} ${open ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1"}`}
      >
        <span className="block text-xs leading-relaxed text-slate-300">{tooltip}</span>
      </span>
    </span>
  );
}
