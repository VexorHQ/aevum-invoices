"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

// Generic rolling number: animates smoothly to the new value (percentages,
// counts, sync progress). Renders with tabular-nums so digits never jitter.
// Under reduced motion the value jumps straight to its target.
export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 0.35,
  className,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const prev = useRef(value);
  const text = useTransform(
    mv,
    (v) => `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`,
  );

  useEffect(() => {
    if (value === prev.current) return;
    prev.current = value;
    if (reduce) {
      mv.set(value);
      return;
    }
    // animate() starts from the motion value's current position, so a new
    // value arriving mid-flight rolls continuously instead of jumping.
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, mv, reduce, duration]);

  return (
    <motion.span className={className ?? "num"}>{text}</motion.span>
  );
}
