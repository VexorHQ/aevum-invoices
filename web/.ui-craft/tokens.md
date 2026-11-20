# Aevum Invoices — Design Tokens

Source: ui-ux-pro-max design-system search ("fintech invoice payment dashboard trustworthy", Minimalism & Swiss Style, navy + paid green), reconciled with ui-craft (one accent; the search's bright blue #2563EB was dropped — it would be a second competing accent; navy covers links/buttons).

## Color (light only — `color-scheme: light`)
| Token | Value | Role |
|---|---|---|
| `--bg` | #F8FAFC | Page paper |
| `--surface` | #FFFFFF | Cards, topbar |
| `--surface-2` | #F1F3F5 | Muted fills, secondary buttons |
| `--line` | #E4E7EB | Hairline borders |
| `--line-strong` | #CBD5E1 | Input / control borders |
| `--text` | #0F172A | Headings, primary text |
| `--text-2` | #334155 | Body text |
| `--text-muted` | #475569 | Secondary text (7.0:1 on white) |
| `--text-faint` | #64748B | Tertiary / fine print (4.8:1 on white) |
| `--navy` | #1E3A5F | Structural ink: primary buttons, links, focus ring, active nav |
| `--navy-soft` | #EAF0F7 | Navy tint (active nav / filter, selected mode) |
| `--accent` | #059669 | THE accent (green): paid dots, hero paid number, success fills |
| `--accent-text` | #047857 | Green text on light (5.0:1) — never white text on #059669 (3.9:1) |
| `--accent-soft` | #ECFDF5 | Paid tint background |
| `--warn` / `--warn-dot` | #92400E / #D97706 | Overdue text / dot (amber, domain-expected) |
| `--bad` / `--bad-dot` | #B91C1C / #DC2626 | Error text / dot |

Accent budget: green appears ≤5 times per viewport (paid dots, hero paid number, success notices). Everything else neutral or navy.

## Type
- Display + body: **IBM Plex Sans** (400/500/600/700), tight tracking (-0.02em) above 24px, sentence case everywhere (eyebrow category labels 12px tracked uppercase are the one exception).
- Data: **IBM Plex Mono** (400/500/600) for amounts in tables, invoice ids, addresses, hashes, block numbers — `tabular-nums` on all numbers. Display metrics (hero numbers) use Sans 700 with `tabular-nums` instead — display role, not data role.
- Base 15px, line-height 1.5. One body font + mono for data (designed hierarchy, not accidental accumulation).

## Shape
- Radius varies by element: inputs 6px, buttons 8px, cards 10px, pills 999px.
- Shadows layered and subtle: `0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.04)`; hover lift only on the main table rows.
- Status = 6–8px dot + text, never a colored pill. Table headers sentence case, 13px, weight 500. Row hover #F8FAFC.
- Focus: 2px solid navy, 2px offset. Min touch target 44px (36px for small buttons). Transitions list specific properties, 150–250 ms, exit faster than enter. `prefers-reduced-motion` disables them.
