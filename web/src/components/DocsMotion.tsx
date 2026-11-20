"use client";

import { useEffect, useRef } from "react";
import { getLenis } from "@/lib/lenis";

// Docs page ONLY (route-split GSAP): reading-progress hairline (scrub),
// per-section reveals, and TOC scroll-spy. Skipped entirely under
// prefers-reduced-motion. Syncs ScrollTrigger with the app-wide Lenis
// instance so scroll positions stay correct during smooth scrolling.
export function DocsMotion() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let onScroll: (() => void) | undefined;
    (async () => {
      const gsap = (await import("gsap")).default;
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      const lenis = getLenis();
      if (lenis) {
        onScroll = () => ScrollTrigger.update();
        lenis.on("scroll", onScroll);
      }
      ctx = gsap.context(() => {
        gsap.to(barRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: 0.3 },
        });
        gsap.utils.toArray<HTMLElement>(".docs-body section").forEach((sec) => {
          gsap.from(sec, {
            opacity: 0,
            y: 16,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: { trigger: sec, start: "top 88%", once: true },
          });
        });
        gsap.utils.toArray<HTMLElement>(".docs-body section").forEach((sec) => {
          ScrollTrigger.create({
            trigger: sec,
            start: "top 40%",
            end: "bottom 40%",
            onToggle: (self) => {
              if (!self.isActive) return;
              document.querySelectorAll(".docs-toc a").forEach((a) => a.classList.remove("active"));
              document.querySelector(`.docs-toc a[href="#${sec.id}"]`)?.classList.add("active");
            },
          });
        });
      });
    })();
    return () => {
      const lenis = getLenis();
      if (lenis && onScroll) lenis.off("scroll", onScroll);
      ctx?.revert();
    };
  }, []);

  return <div ref={barRef} className="docs-progress" aria-hidden="true" />;
}
