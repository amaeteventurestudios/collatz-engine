"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HelpCircle } from "lucide-react";

type PanelHelpProps = {
  title: string;
  description: string;
  details?: string;
  source?: string;
  warning?: string;
  operatorNote?: string;
  align?: "left" | "right" | "center";
};

export function PanelHelp({ title, description, details, source, warning, operatorNote }: PanelHelpProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  // Compute viewport-relative position when opening
  function reposition() {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.right - 288, width: 288 });
  }

  function open_() { reposition(); setOpen(true); }
  function close() { setOpen(false); }

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!buttonRef.current?.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const tooltip =
    open && typeof window !== "undefined"
      ? createPortal(
          <div
            id={id}
            role="tooltip"
            style={{
              position: "absolute",
              top: pos.top,
              left: Math.max(8, Math.min(pos.left, window.innerWidth - pos.width - 8)),
              width: pos.width,
              zIndex: 9999,
            }}
            className="pointer-events-none rounded-lg border border-cyan-400/25 bg-slate-950 px-4 py-3 shadow-2xl shadow-cyan-950/40"
          >
            <span className="block text-xs font-bold text-slate-50">{title}</span>
            <span className="mt-1.5 block text-xs leading-relaxed text-slate-300">{description}</span>
            {details && (
              <span className="mt-2 block text-[11px] leading-relaxed text-slate-400">{details}</span>
            )}
            {source && (
              <span className="mt-2 block text-[10px] text-slate-500">
                <span className="font-semibold">Source:</span> {source}
              </span>
            )}
            {warning && (
              <span className="mt-2 block rounded border border-orange-500/30 bg-orange-950/30 px-2 py-1.5 text-[10px] leading-relaxed text-orange-300">
                ⚠ {warning}
              </span>
            )}
            {operatorNote && (
              <span className="mt-2 block text-[10px] italic leading-relaxed text-slate-500">
                Note: {operatorNote}
              </span>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onMouseEnter={open_}
        onMouseLeave={close}
        onFocus={open_}
        onBlur={close}
        onClick={open_}
        className={`panel-help-pulse inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-slate-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${
          open
            ? "border-cyan-300/70 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.35)]"
            : "border-cyan-400/25 bg-slate-950/40 hover:border-cyan-300/70 hover:bg-cyan-400/10 hover:text-cyan-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.28)]"
        }`}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {tooltip}
    </span>
  );
}
