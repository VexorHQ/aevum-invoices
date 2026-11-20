import type Lenis from "lenis";

// Module-level handle so DocsMotion can sync ScrollTrigger with the Lenis
// instance owned by <SmoothScroll /> in the layout. Never imported by a
// server component — client only.
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}
