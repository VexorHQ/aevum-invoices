"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

// Shared Motion entrance tokens (motion-design durations/easings).
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const fadeUpChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Under reduced motion, render the final state with no animation.
export function useEnter(): { initial: false | "hidden"; animate?: "show" } {
  const reduce = useReducedMotion();
  return reduce ? { initial: false } : { initial: "hidden", animate: "show" };
}

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const enter = useEnter();
  return (
    <motion.div className={className} variants={staggerParent} {...enter}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={fadeUpChild}>
      {children}
    </motion.div>
  );
}
