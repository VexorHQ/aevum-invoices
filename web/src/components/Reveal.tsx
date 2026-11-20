"use client";

import { useReducedMotion } from "motion/react";

// Shared Motion entrance tokens live in @/lib/motion.ts (Round 3). This file
// keeps the Round 2 import surface working: pages import
// { staggerParent, fadeUpChild, useEnter, Stagger, StaggerItem } from here.
export { blurUpChild, fadeUpChild, staggerParent } from "@/lib/motion";
export { StaggerList as Stagger, StaggerItem } from "./motion/StaggerList";

// Under reduced motion, render the final state with no animation.
export function useEnter(): { initial: false | "hidden"; animate?: "show" } {
  const reduce = useReducedMotion();
  return reduce ? { initial: false } : { initial: "hidden", animate: "show" };
}
