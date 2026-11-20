# Aevum Invoices — Design Brief (ui-craft)

**Craft Read:** Command dashboard for freelance operators, product language, light Swiss + navy ink + one paid-green accent, variance 4, signature bet: custom receipt-motif empty states.

## Product
Aevum Invoices — freelancers and small shops bill clients in tUSD8 on Aevum testnet (chain 44005). Proof of payment is on-chain (InvoicePaid event = receipt). Track: Invoice Payments, Aevum Builder Challenge #1.

## Audience + the 60-second decision
Freelancer / small-shop operator. The decision in the next 60 seconds: **"Who still owes me, and have I been paid?"**
- Hero metric: total **paid** (money in).
- Supports: total still open, open invoice count, overdue count.
- The work queue (invoice table) is the product — it dominates the dashboard.

## Composition (ui-craft recipe-dashboard, Command/operator)
Topbar (brand + nav + wallet) → page head (title + context + primary action) → compact metric strip (1 hero + 3 supports) → filter row (ghost buttons) → work-queue table → states (loading / empty / error) for every data region.

## Style
Minimalism & Swiss Style (ui-ux-pro-max design system search, "fintech invoice payment dashboard trustworthy", density 8 / variance 4 / motion 4). Light paper background, ink text, one green accent. No gradients, no purple/cyan, no glass, no emoji icons.

## Knobs
- CRAFT_LEVEL 7, MOTION_INTENSITY 4 (150–250 ms transitions, one subtle load entrance, `prefers-reduced-motion` honored), VISUAL_DENSITY 8 (dashboard-dense), DESIGN_VARIANCE 4.

## Learned constraints
- Never change contract wiring or env: NEXT_PUBLIC_NETWORKS=aevum, NEXT_PUBLIC_CHECKOUT_AEVUM=0x535Cb84930079C7Cc6e4201BDcE6e3a5e01432cD, NEXT_PUBLIC_DEPLOY_BLOCK_AEVUM=3633638, NEXT_PUBLIC_REPO_URL. Never touch the contract.
- All routes and functions stay: dashboard + filters, New invoice form, invoice detail + standard/gasless pay, receipts, activity feed, Setup, Docs.
- The paid test invoice (#6D6D-2639, 1 tUSD8) is real on-chain data — show it, don't fake demo data.
- RainbowKit wallet UI keeps its own theme; align it to light + navy accent, don't fight it.
