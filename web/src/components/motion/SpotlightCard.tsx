"use client";

import { motion, type MotionProps } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

// Card with a flat hover tint (navy, 7% alpha) plus a 2px hover lift from CSS.
// Round 4: the tint used to be a cursor-tracking radial glow; the detector
// flags radial gradients on rounded surfaces as a generated-UI tell, and a
// flat tint is the calmer, more professional hover state anyway. The
// cursor-tracking mousemove handler went with it — no dead code.
export function SpotlightCard({
  children,
  className,
  ...motionProps
}: {
  children: ReactNode;
  className?: string;
} & MotionProps &
  HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div className={`spotlight-card${className ? ` ${className}` : ""}`} {...motionProps}>
      {children}
    </motion.div>
  );
}
