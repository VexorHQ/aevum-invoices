"use client";

import { useEffect, useRef } from "react";
import type { Container } from "@tsparticles/engine";

// Ultra-subtle drifting-dot field in the dashboard hero band ONLY
// (~45 dots, no links, no interactivity, fpsLimit 30). Pauses when the tab
// is hidden or the hero scrolls out of view; not rendered at all under
// prefers-reduced-motion. Engine + preset are loaded lazily so the rest of
// the app never pays for them.
export function HeroParticles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let container: Container | undefined;
    let observer: IntersectionObserver | null = null;
    let onVisibility: (() => void) | null = null;

    (async () => {
      const { tsParticles } = await import("@tsparticles/engine");
      const { loadBasic } = await import("@tsparticles/basic");
      if (cancelled || !ref.current) return;
      await loadBasic(tsParticles);
      container = await tsParticles.load({
        id: "hero-particles",
        options: {
          fpsLimit: 30,
          fullScreen: false,
          background: { color: "transparent" },
          particles: {
            number: { value: 45 },
            color: { value: ["#1E3A5F", "#059669", "#64748B"] },
            opacity: { value: { min: 0.12, max: 0.3 } },
            size: { value: { min: 1, max: 2.5 } },
            move: { enable: true, speed: 0.4, direction: "none", outModes: "out" },
          },
          detectRetina: true,
        },
      });
      if (cancelled || !container) return;
      onVisibility = () => {
        if (document.hidden) container?.pause();
        else container?.play();
      };
      document.addEventListener("visibilitychange", onVisibility);
      observer = new IntersectionObserver((entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        if (visible && !document.hidden) container?.play();
        else container?.pause();
      });
      if (ref.current) observer.observe(ref.current);
    })();

    return () => {
      cancelled = true;
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
      container?.destroy();
    };
  }, []);

  return <div ref={ref} id="hero-particles" className="particles" aria-hidden="true" />;
}
