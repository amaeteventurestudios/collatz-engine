"use client";

import { useEffect, useId, useRef, useState } from "react";
import { HelpCircle } from "lucide-react";

type PanelHelpProps = {
  title: string;
  description: string;
  align?: "left" | "right" | "center";
};

const alignClasses: Record<NonNullable<PanelHelpProps["align"]>, string> = {
  left: "left-0",
  right: "right-0",
  center: "left-1/2 -translate-x-1/2",
};

export function PanelHelp({ title, description, align = "right" }: PanelHelpProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        className={`panel-help-pulse inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-slate-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
          open
            ? "border-cyan-300/70 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
            : "border-cyan-400/25 bg-slate-950/40 hover:border-cyan-300/70 hover:bg-cyan-400/10 hover:text-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.28)]"
        }`}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <span
        id={id}
        role="tooltip"
        aria-hidden={!open}
        className={`panel-help-popover ${open ? "panel-help-popover-open visible" : "invisible"} ${alignClasses[align]} pointer-events-none absolute top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-cyan-400/25 bg-slate-950 px-4 py-3 text-left shadow-2xl shadow-cyan-950/40 max-sm:fixed max-sm:left-4 max-sm:right-4 max-sm:top-20 max-sm:mt-0 max-sm:w-auto max-sm:translate-x-0`}
      >
        <span className="block text-xs font-bold text-slate-50">{title}</span>
        <span className="mt-1.5 block text-xs leading-relaxed text-slate-300">
          {description}
        </span>
      </span>
    </span>
  );
}
