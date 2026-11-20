"use client";

import { motion, type MotionProps } from "motion/react";
import type { HTMLAttributes, MouseEvent, ReactNode } from "react";

// Card with a cursor-tracking spotlight: a soft radial glow (navy, 7% alpha)
// follows the pointer inside the card, plus a 2px hover lift from CSS.
// The glow lives in ::before (z-index -1, isolated stacking context) so text
// stays crisp. No animation runs while the pointer is still — the glow is
// paint-only, driven by CSS custom properties set on mousemove.
export function SpotlightCard({
  children,
  className,
  ...motionProps
}: {
  children: ReactNode;
  className?: string;
} & MotionProps &
  HTMLAttributes<HTMLDivElement>) {
  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  return (
    <motion.div className={`spotlight-card${className ? ` ${className}` : ""}`} onMouseMove={onMouseMove} {...motionProps}>
      {children}
    </motion.div>
  );
}
