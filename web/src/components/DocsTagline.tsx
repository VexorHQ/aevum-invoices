"use client";

import { useEffect, useRef } from "react";

// Docs hero rotating tagline (typed.js). The first phrase renders as static
// text, so the line is never empty without JS — Typed.js replaces it once
// loaded. Skipped under prefers-reduced-motion (static first phrase stays).
const PHRASES = ["Bill in tUSD8.", "Get paid on-chain.", "Prove it with an event."];

export function DocsTagline() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let typed: { destroy: () => void } | undefined;
    (async () => {
      const Typed = (await import("typed.js")).default;
      if (!ref.current) return;
      typed = new Typed(ref.current, {
        strings: PHRASES,
        typeSpeed: 45,
        backSpeed: 25,
        backDelay: 2200,
        loop: true,
      });
    })();
    return () => typed?.destroy();
  }, []);

  return (
    <p className="tagline" aria-live="off">
      <span ref={ref}>{PHRASES[0]}</span>
    </p>
  );
}
