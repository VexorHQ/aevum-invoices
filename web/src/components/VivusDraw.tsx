"use client";

import { useEffect, useRef, type ReactElement } from "react";
import Vivus from "vivus";

// Draws an SVG (stroke-based, e.g. the receipt motif or a check) stroke by
// stroke, as if hand-drawn. Under reduced motion the final state renders
// instantly. The SVG comes from children so the icon stays a single source
// of truth in Icons.tsx.
export function VivusDraw({
  children,
  // Vivus duration is in FRAMES, not ms (default 120 ≈ 2s at 60fps).
  // 60 frames ≈ 1s for these small motifs.
  duration = 60,
  start = "inViewport",
  className,
}: {
  children: ReactElement;
  duration?: number;
  start?: "inViewport" | "autostart" | "manual";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const svg = ref.current?.querySelector("svg");
    if (!svg) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = new Vivus(svg as unknown as HTMLElement, {
      type: "oneByOne",
      duration: reduce ? 1 : duration,
      start: reduce ? "autostart" : start,
      animTimingFunction: Vivus.EASE,
    });
    if (reduce) instance.finish();
    return () => {
      instance.destroy();
    };
  }, [duration, start]);

  return (
    <span ref={ref} className={className} aria-hidden="true">
      {children}
    </span>
  );
}
