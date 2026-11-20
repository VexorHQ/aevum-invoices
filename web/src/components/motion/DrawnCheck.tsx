"use client";

import { motion, useReducedMotion } from "motion/react";

// Tiny checkmark that draws itself in (SVG pathLength 0 → 1). Used for
// settled status badges and payment step dots. The big success marks on the
// receipt / new-invoice screens still use VivusDraw — this is the light,
// inline version for 12–14px icons. Under reduced motion it renders complete.
export function DrawnCheck({ size = 14, strokeWidth = 3.5 }: { size?: number; strokeWidth?: number }) {
  const reduce = useReducedMotion();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      <motion.path
        d="M5 12l5 5L20 7"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />
    </svg>
  );
}
