"use client";

import { useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

// Ambient cursor glow for the dashboard hero: a very subtle navy radial
// spotlight (6% alpha) that follows the pointer across the hero band with a
// spring lag, so the light trails the cursor instead of snapping to it.
// Paint-only (a motion-template background on an absolutely positioned div),
// pointer-events none, never rendered under reduced motion. The glow div is
// positioned over its parent (.hero-band), so it listens for mousemove on the
// parent element.
export function HeroGlow({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const mx = useMotionValue(-500);
  const my = useMotionValue(-500);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });
  const background = useMotionTemplate`radial-gradient(300px circle at ${sx}px ${sy}px, rgba(30,58,95,0.06), transparent 70%)`;

  useEffect(() => {
    const parent = ref.current?.parentElement;
    if (!parent || reduce) return;
    const onMove = (e: MouseEvent) => {
      const r = parent.getBoundingClientRect();
      mx.set(e.clientX - r.left);
      my.set(e.clientY - r.top);
    };
    const onLeave = () => {
      mx.set(-500);
      my.set(-500);
    };
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, [mx, my, reduce]);

  if (reduce) return null;
  return <motion.div ref={ref} className={className ?? "hero-glow"} aria-hidden="true" style={{ background }} />;
}
