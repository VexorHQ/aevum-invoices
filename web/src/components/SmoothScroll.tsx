"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { setLenis } from "@/lib/lenis";

// App-wide smooth scroll (lenis skill). autoRaf runs its own rAF loop;
// anchors:true smooth-scrolls # links (Docs TOC). Lenis respects
// prefers-reduced-motion by default, so no extra guard is needed here.
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, anchors: true, lerp: 0.1 });
    setLenis(lenis);
    return () => {
      lenis.destroy();
      setLenis(null);
    };
  }, []);
  return null;
}
