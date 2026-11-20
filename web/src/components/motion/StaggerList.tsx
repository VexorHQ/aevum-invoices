"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fadeUpChild, staggerParent } from "@/lib/motion";
import { useEnter } from "@/components/Reveal";

// Canonical staggered list (Round 3 home for the pattern Round 2 kept in
// Reveal.tsx — Reveal re-exports these, so existing imports keep working).
// Children enter 70ms apart; total budget stays under 500ms.
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
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
