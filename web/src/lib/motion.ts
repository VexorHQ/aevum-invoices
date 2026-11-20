// Central motion tokens — one source of truth for every animation in the app.
// (ui-craft motion tokens, brief-round3.md; durations/easings from motion-design.)
// Only transform / opacity / clip-path / filter(entrance only) are animated.
// prefers-reduced-motion is honored globally via MotionConfig reducedMotion="user"
// in providers.tsx, and per-component via useReducedMotion where it matters.
import type { Transition, Variants } from "motion/react";

/** Signature easing — the smooth decelerate used by ~80% of animations. */
export const easeSmooth: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Exits / dismissals — gentle start, fast departure. */
export const easeIn: [number, number, number, number] = [0.55, 0, 1, 0.45];
/** On-screen, both ends smooth. */
export const easeInOut: [number, number, number, number] = [0.65, 0, 0.35, 1];
/** Material emphasized — entrances that need attention. */
export const easeEmphasized: [number, number, number, number] = [0.2, 0, 0, 1];

/** Duration palette (seconds): quick / standard / slow. */
export const durations = { fast: 0.12, base: 0.2, medium: 0.28, slow: 0.4 } as const;

/**
 * Preset springs. Snappy is the default for interactive feedback (tabs, pills,
 * toasts); soft for cards and lists; gentle for ambient / large surfaces.
 * stiffness 380 / damping 30 is the house spring — tactile, never bouncy.
 */
export const springSnappy: Transition = { type: "spring", stiffness: 380, damping: 30 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 26 };
export const springGentle: Transition = { type: "spring", stiffness: 170, damping: 22 };

export const fadeIn: Transition = { duration: durations.base, ease: easeSmooth };
export const fadeInSlow: Transition = { duration: durations.slow, ease: easeSmooth };

/** Stagger parent — children enter 70ms apart, total budget < 500ms. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

/** Standard entrance: rise 10px + fade. */
export const fadeUpChild: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: easeSmooth } },
};

/** Hero entrance: rise 10px + fade + blur-to-sharp (4px → 0). */
export const blurUpChild: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: easeSmooth } },
};

/** Fade-only entrance (table swaps, notices). */
export const fadeChild: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: easeSmooth } },
};

/** Small swap (tab pills, icon morphs, button labels): rise 6px + fade. */
export const swapChild: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: easeSmooth } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: easeIn } },
};
