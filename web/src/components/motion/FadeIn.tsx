"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { blurUpChild, fadeUpChild } from "@/lib/motion";
import { useEnter } from "@/components/Reveal";

// Single-element entrance: rise + fade, optionally blur-to-sharp (hero).
// Under reduced motion the final state renders with no animation.
export function FadeIn({
  children,
  className,
  blur = false,
  delay = 0,
  variants,
}: {
  children: ReactNode;
  className?: string;
  blur?: boolean;
  delay?: number;
  variants?: Variants;
}) {
  const reduce = useReducedMotion();
  const enter = useEnter();
  const v = variants ?? (blur ? blurUpChild : fadeUpChild);
  return (
    <motion.div
      className={className}
      variants={v}
      {...enter}
      transition={delay && !reduce ? { delay } : undefined}
    >
      {children}
    </motion.div>
  );
}
