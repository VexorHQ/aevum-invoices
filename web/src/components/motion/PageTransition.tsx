"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { easeSmooth } from "@/lib/motion";

// Page transition: on every route change the new page enters with a short
// rise + fade (opacity 0, y 8 → opacity 1, y 0, 300ms). Enter-only, keyed by
// pathname — no AnimatePresence exit, so navigation never waits on an old
// page that is already gone. Under reduced motion the content renders as-is.
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: easeSmooth }}
    >
      {children}
    </motion.div>
  );
}
