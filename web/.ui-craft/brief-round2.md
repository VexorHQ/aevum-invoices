# Aevum Invoices — Design Brief, Round 2 (Modern Clean)

**Craft Read:** Command dashboard for freelance operators, product language, light Swiss + navy ink + one paid-green accent, variance 6, signature bet: a quiet "settled dust" particle field in the hero band + hand-drawn receipt motif.

Round 2 evolves Round 1 (light Swiss ledger, commit 1fd6686) — same identity, more richness. NOT a new theme, NOT dark, NOT a different font. Junes: "modern clean, gunakan seluruh skill design, agar tidak polos".

## Direction (ui-ux-pro-max, verified 2026-11-20)

`search.py "fintech invoice payment dashboard modern clean trustworthy" --design-system --variance 6 --motion 6 --density 8` returned: **Minimalism & Swiss Style** (same as Round 1), Pattern "Trust & Authority", colors Primary #1E3A5F / Accent #059669 / Background #F8FAFC / Foreground #0F172A — identical to Round 1 tokens. Typography suggestion Figtree/Noto Sans was **not** taken: IBM Plex Sans + Mono stays (a designed two-family hierarchy with a named data role; the search suggestion is a default, Round 1's choice is deliberate). GSAP preset attached: Stagger List, 300–450ms, `back.out(1.4)` — the stagger pattern is used; the easing is softened to the motion tokens below (back.out reads bouncy on a ledger). Avoid list from the search: excessive decoration, complex shadows, 3D effects — all respected.

## Knobs (ui-craft)

- CRAFT_LEVEL 8 (Polish Pass at the end), MOTION_INTENSITY 6 (standard entrances + hover + one scroll reveal per section; no scroll-linked page choreography except the Docs progress hairline), VISUAL_DENSITY 8 (dashboard-dense, unchanged), DESIGN_VARIANCE 6 (balanced/modern — richer than Round 1's 4, still symmetric and safe).

## Motion tokens (ui-craft motion.md + motion-design)

```css
--motion-fast: 120ms; --motion-base: 200ms; --motion-medium: 280ms; --motion-slow: 400ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1); --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1); --ease-soft: cubic-bezier(0.4, 0, 0.2, 1);
```

Rules: transform + opacity only; exit faster than enter; no bounce/elastic on functional UI; `prefers-reduced-motion` disables every animation and renders the final state (Lenis off by default, Motion via `useReducedMotion`, GSAP skipped, Typed.js skipped, particles not rendered, Vivus finishes instantly).

## Skill map — used, one concrete visible job each

| Skill | Version | Visible job |
|---|---|---|
| ui-ux-pro-max | 2.15.0 | Design-system authority for Round 2 (search above) + pre-delivery checklist |
| ui-craft | (MIT) | Craft rules, motion budget, anti-slop gate, this brief + tokens |
| motion | 14.12.0 | Primary animation engine: staggered entrances (metrics, table rows, checks, form fields), layout animation on filter change, count-ups (hero "Paid in", Setup score), step transitions on invoice detail |
| gsap + ScrollTrigger | 3.15 | Docs page ONLY (route-split): reading-progress hairline (scrub), section reveals, TOC scroll-spy |
| lenis | 1.3.27 | Smooth scroll app-wide (`autoRaf`, `anchors`, respects reduced motion); drives ScrollTrigger |
| typed.js | 2.0.12 (MIT — NOT 3.0.0, which is GPL) | Docs hero rotating tagline (3 phrases, loop, `stringsElement` static fallback; skipped under reduced motion) |
| tsParticles (engine + basic) | 4.x | Ultra-subtle drifting-dot field in the dashboard hero band ONLY (~45 dots, no links, no interactivity, fpsLimit 30, paused when tab hidden, not rendered under reduced motion) |
| vivus | 0.4.6 (+ @types/vivus) | Hand-drawn SVG reveal: ReceiptIcon motif in empty states (dashboard/activity) + drawn check motif on the receipt page paid notice and the New-invoice success screen |
| motion-design | 1.0.0 | Principles only (no runtime): duration/easing tables, exit-faster-than-enter, 1/3 rule — applied to the tokens above |

## Skill map — deliberately NOT used, with reasons

| Skill | Reason |
|---|---|
| lottie | Plays ready-made After Effects JSON; no AE asset exists, and the skill forbids hand-authoring animations from scratch |
| rive | Needs a `.riv` file authored in the Rive Editor; none exists; cannot be authored in code |
| animejs | Jobs fully covered by Motion (springs/stagger) + GSAP (timelines); a third tween engine is kitchen-sink |
| react-spring | Overlaps Motion entirely; Motion is the chosen spring engine |
| theatrejs | Needs visual Studio keyframe authoring; no timeline-choreographed scene needs it |
| mojs | Barely maintained (2023 package, no TS types); its signature burst is not needed — payment success already has a notice + Vivus check draw |
| matterjs | Physics engine; no physics bodies in a ledger UI |
| p5js | Generative-art canvas; would fight the Swiss cleanliness; no generative content needed |
| pixijs | GPU 2D renderer; object counts here are tiny; DOM is the right layer |
| paperjs | Vector drawing tools; no drawing tools in this product |
| threejs | No 3D content; a 3D hero would be pure decoration + heavy (search's Avoid list: 3D effects) |
| motion-canvas, hyperframes | Video-rendering tools, not web UI |
| remotion-* | Video rendering, not web UI |

## Richness levers (all inside Round 1 tokens)

1. **Hero band (dashboard):** tsParticles dot field behind the page head + a live chip ("Live · block N", real head block from the invoices query).
2. **Metric strip:** hero "Paid in" counts up on first load; honest derived "settled share" bars under Paid-in / Still-open (paid ÷ (paid+open), no fake data — no sparklines, no history invented); staggered entrance; hover lift.
3. **Table:** staggered row entrance; layout animation on filter change (key-remount fade, no fragile exit animation inside `<tr>`); hover left-edge indicator.
4. **Activity:** timeline treatment — vertical hairline with dots (green = paid, navy = created), staggered items.
5. **Setup:** score counts up; checks stagger in.
6. **Docs:** GSAP progress hairline + section reveals + TOC scroll-spy; Typed.js rotating tagline in the hero.
7. **Receipt:** Vivus-drawn check motif in the paid notice; transaction hash truncated + copy button (fixes Round 1 wrap issue).
8. **Invoice detail:** copyable ids/addresses (truncated mono + copy button); mode switch fades the steps list; step dots keep their states.
9. **New invoice:** field-group stagger; success screen gets a Vivus-drawn check.
10. **Header (mobile fix):** nav becomes a horizontally scrollable single row; GitHub label hidden on small screens — topbar is 2 rows max, never 3.
11. **Buttons:** `:active` press (translateY 1px) + hover shadow deepen on primary.

## Fixes from Round 1 (carried into Round 2)

- Mobile topbar wrapping to 3 rows → fixed (see 10 above).
- Receipt hash wrapping mid-string → truncated display + copy button (see 7 above).
- Unpaid-invoice pay UI still cannot be tested end-to-end (no unpaid invoice on chain; do NOT create one for testing) — verify via mock HTML with the built CSS, as in Round 1.

## Learned constraints (unchanged from Round 1)

- Never change contract wiring or env: NEXT_PUBLIC_NETWORKS=aevum, NEXT_PUBLIC_CHECKOUT_AEVUM=0x535Cb84930079C7Cc6e4201BDcE6e3a5e01432cD, NEXT_PUBLIC_DEPLOY_BLOCK_AEVUM=3633638, NEXT_PUBLIC_REPO_URL. Never touch the contract.
- All routes and functions stay: dashboard + filters, New invoice form, invoice detail + standard/gasless pay, receipts, activity feed, Setup, Docs.
- The paid test invoice (#6D6D-2639, 1 tUSD8) is real on-chain data — show it, don't fake demo data.
- RainbowKit wallet UI keeps its own theme; align it to light + navy accent, don't fight it.
- Accent budget: green ≤5 placements per viewport. One accent, navy is structural ink.
