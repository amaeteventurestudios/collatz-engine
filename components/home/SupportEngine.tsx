"use client";

import { useRef, useState } from "react";
import Script from "next/script";
import { Heart } from "lucide-react";
import { PanelHelp } from "@/components/ui/PanelHelp";

const KOFI_ID = "W0C2209OAL";

declare global {
  interface Window {
    kofiwidget2?: {
      init: (text: string, color: string, id: string) => void;
      getHTML: () => string;
    };
  }
}

export function SupportEngine() {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  function renderWidget() {
    if (!widgetRef.current || !window.kofiwidget2) return;
    window.kofiwidget2.init("Support the Engine on Ko-fi", "#72a4f2", KOFI_ID);
    widgetRef.current.innerHTML = window.kofiwidget2.getHTML();
    setWidgetReady(true);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
      <Script
        id="ko-fi-widget"
        src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"
        strategy="lazyOnload"
        onReady={renderWidget}
        onError={() => setWidgetReady(false)}
      />
      <div className="mb-3 flex items-center gap-2">
        <Heart className="h-4 w-4 text-sky-400" />
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Support the Engine
        </p>
        <PanelHelp
          title="Support the Engine"
          description="Optional contributions help support compute, hosting, data exports, and continued development of the public engine."
          align="left"
        />
      </div>
      <p className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        The Collatz Engine is a public autonomous mathematics exploration system. Contributions
        help support compute, hosting, data exports, and continued development.
      </p>
      <div ref={widgetRef} className="min-h-10" aria-live="polite" />
      {!widgetReady && (
        <a
          href={`https://ko-fi.com/${KOFI_ID}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-md border border-sky-400/50 bg-sky-400/10 px-4 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-400/15 dark:text-sky-200"
        >
          Support the Engine on Ko-fi
        </a>
      )}
    </div>
  );
}
