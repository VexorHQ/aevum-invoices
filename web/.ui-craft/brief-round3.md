# Brief — Redesign Ronde 3: Motion System (Aevum Invoices)

Tanggal: 20 Nov 2026. Basis: commit `98201fd` (ronde 2, live di Vercel).
Identitas visual dipertahankan penuh dari ronde 1–2: light Swiss ledger —
kertas `#F8FAFC`, navy `#1E3A5F`, hijau Paid `#059669`, IBM Plex Sans +
IBM Plex Mono. Tidak ada perubahan route, parameter URL, logika RPC/relayer/
EIP-712, atau fungsionalitas inti — hanya presentasi + animasi.

## Arah desain

Vibe: fintech Web3 yang elegan, taktil, responsif, "terasa mahal". Aturan
keras: hanya properti GPU-friendly yang dianimasikan (`transform`, `opacity`,
`clip-path`; `filter: blur` hanya untuk entrance hero, 4px → 0). Tidak ada
layout shift (CLS), tidak ada animasi yang memblokir interaksi.
`prefers-reduced-motion` dihormati global lewat `MotionConfig
reducedMotion="user"` di `providers.tsx` (dan `useReducedMotion` di
komponen yang relevan). Semua animasi selesai < 500ms kecuali progress beam.

## Token motion — `web/src/lib/motion.ts` (satu sumber kebenaran)

| Token | Nilai | Pakai untuk |
|---|---|---|
| `easeSmooth` | `[0.22, 1, 0.36, 1]` | ~80% transisi (signature easing) |
| `easeIn` | `[0.55, 0, 1, 0.45]` | exit / dismiss |
| `easeInOut` | `[0.65, 0, 0.35, 1]` | on-screen dua arah |
| `easeEmphasized` | `[0.2, 0, 0, 1]` | entrance yang butuh perhatian |
| `springSnappy` | stiffness 380, damping 30 | feedback interaktif (tab, pill, toast) |
| `springSoft` | stiffness 260, damping 26 | kartu & list |
| `springGentle` | stiffness 170, damping 22 | ambient / permukaan besar |
| Durasi | fast 0.12 / base 0.2 / medium 0.28 / slow 0.4 (detik) | — |
| `staggerParent` | stagger 70ms, delay 50ms, total < 500ms | entrance berkelompok |
| `fadeUpChild` | naik 10px + fade, 0.35s | item list / kartu |
| `blurUpChild` | naik 10px + fade + blur 4px→0, 0.45s | hero |
| `fadeChild` | fade 0.3s | swap tabel / notice |
| `swapChild` | naik 6px + fade (exit turun 6px, 0.15s) | pill, morph ikon, label tombol |

## Animasi per bagian (A–F)

**A. Header & navigasi** — `Header.tsx`, `layout.tsx`, `PageTransition.tsx`.
Shared-layout pill (`layoutId="nav-pill"`) meluncur antar tab Invoices / New
invoice / Activity / Setup / Docs; pill yang sama dipakai untuk filter tabel
(`layoutId="filter-pill"`) dan mode pembayaran (`layoutId="mode-pill"`).
Sticky glass header: saat scroll, background 94% putih + `backdrop-filter:
blur(20px)` + hairline lebih tegas + shadow tipis. Page transition:
`opacity 0, y 8 → 1, 0` keyed by pathname.

**B. Hero** — `page.tsx`, `HeroGlow.tsx`, `SpotlightCard.tsx`.
Live pill "Aevum testnet · tUSD8": titik hijau pulse lembut + border shimmer.
Staggered entrance: eyebrow, judul, lede, CTA muncul berurutan (70ms) dengan
`blurUpChild`. `HeroGlow`: spotlight radial mengikuti kursor (spring lag,
sangat tipis, teks tetap tajam). CTA `New invoice`: sheen sweep saat hover +
`whileTap={{ scale: 0.97 }}`. Kartu metrik memakai `SpotlightCard`
(border glow mengikuti kursor) + progress bar hijau di bawah angka.

**C. On-chain sync** — `SyncProgress.tsx`, `AnimatedNumber.tsx`, `page.tsx`.
Progress beam: bar bergerak mulus + energy beam shimmer di ujungnya.
`AnimatedNumber`: rolling counter 0% → 100% dan nominal tUSD8 dengan
`font-variant-numeric: tabular-nums`. Skeleton-to-data morphing:
`InvoiceSkeleton` (shimmer) → daftar invoice lewat `AnimatePresence
mode="wait"`, tanpa kedipan kasar.

**D. Daftar invoice & detail** — `page.tsx`, `StatusBadge.tsx`, `SpotlightCard.tsx`.
Staggered list + `layout` saat filter berubah / invoice baru masuk.
Hover card: spotlight border mengikuti kursor + elevasi ringan.
`StatusBadge`: Paid = centang SVG tergambar (`DrawnCheck`, pathLength 0→1);
Open/Overdue = titik pulse; Created = titik navy polos.

**E. Form & pembayaran** — `invoices/new/page.tsx`,
`invoices/[invoiceId]/page.tsx`, `Copyable.tsx`, `Toast.tsx`, `CodeCopy.tsx`.
Fokus input responsif (lift halus); pesan validasi slide-down via
`AnimatePresence`; tombol submit morphing label
(`Sign & pay …` → `Check your wallet…` → `Waiting for relayer…` →
`Confirming…` → `Paid`) + spinner; step pembayaran: dot berisi centang
tergambar saat selesai. `Copyable`: morph ikon Copy → Check + toast navy
(spring, auto-dismiss 2.2 detik) di `ToastProvider`.

**F. Activity, Setup, Docs** — `activity/page.tsx`, `setup/page.tsx`,
`docs/page.tsx`, `FaqAccordion.tsx`, `CodeCopy.tsx`.
Activity: timeline staggered + garis vertikal tergambar; skeleton timeline
saat scan. Setup: chip status morph (ikon berganti via `AnimatePresence`),
checklist dengan `layout`. Docs: accordion FAQ satu-terbuka (animasi height +
opacity), tombol copy blok kode (morph ikon + toast), scroll-spy + progress
hairline (GSAP, dari ronde 2).

## Yang terlihat di screenshot diam (pelajaran ronde 2)

Ronde 2 dikritik "seperti tidak ada yang berubah" di still. Ronde 3 sengaja
menambahkan penanda statis: pill tab aktif, pill filter aktif, pill mode,
badge Paid dengan centang, progress bar metrik, skeleton shimmer, chip live,
toast. Verifikasi: 17 screenshot di `redesign-shots-round3/` (desktop +
mobile 390px + loading + scrolled + toast + mock).

## Komponen baru — `web/src/components/motion/`

`FadeIn.tsx`, `StaggerList.tsx` (Reveal re-export dari sini),
`SpotlightCard.tsx`, `AnimatedNumber.tsx`, `DrawnCheck.tsx`,
`StatusBadge.tsx`, `PageTransition.tsx`, `Toast.tsx`, `HeroGlow.tsx`,
`SyncProgress.tsx`, `CodeCopy.tsx`, `FaqAccordion.tsx`, plus
`web/src/lib/motion.ts`.

## Reuse ronde 2 (bukan duplikat)

- `CountUp` — angka mengalir metrik hero (dipakai ulang; hanya easing-nya
  dipindah ke `lib/motion.ts`).
- `Copyable` — morph Copy → Check + toast (dipakai ulang; tombol dibuat
  icon-only 26px).
- `VivusDraw` — centang besar di receipt & layar sukses New invoice (tetap
  dipakai); `DrawnCheck` baru adalah versi ringan inline 12–14px untuk badge
  & step dot (motion `pathLength`, bukan Vivus).
- `HeroParticles` (tsParticles), `SmoothScroll` (Lenis), `DocsMotion`
  (GSAP), `DocsTagline` (typed.js) — tetap dipakai, tidak ditulis ulang.

## Skill yang dipakai (satu fungsi terlihat per skill)

- **motion** (framer-motion, `motion/react` v14.12.0) — mesin semua animasi:
  `layoutId` pills, `AnimatePresence`, `motion.path`, springs.
- **motion-design** — kosakata easing/durasi/spring & anggaran stagger
  (< 500ms) yang dipakai di `lib/motion.ts`.
- **ui-ux-pro-max** — disiplin token & micro-interaction: `whileTap 0.97`,
  sheen CTA, status badge sebagai sistem, bukan dekorasi.
- **ui-craft** — aturan anti-slop + format brief/token ini; discovery dulu
  sebelum kode (brief ronde 1–2 dibaca sebelum implementasi).

## Skill yang sengaja TIDAK dipakai

- **lottie / theatrejs / rive / motion-canvas** — runtime animasi berat
  (timeline/3D/Rive) tanpa pekerjaan yang terlihat di ledger UI ini; CSS +
  SVG + motion/react sudah cukup.
- **p5js / pixijs / paperjs / matterjs** — canvas & fisika; tidak ada adegan
  canvas baru (partikel hero sudah ada dari ronde 2).
- **mojs** — dormant (rilis terakhir 2023); fungsinya tercakup motion/react.
- **animejs / react-spring** — duplikat dari motion/react (spring + easing
  sudah ada di `lib/motion.ts`).
- **vivus** (di luar yang sudah ada) — centang baru memakai motion
  `pathLength`, lebih ringan daripada memuat Vivus lagi.
- **remotion-*** — khusus video, tidak relevan untuk web app.
- **framer-motion (paket npm)** — library yang sama dengan `motion` 14.x;
  tidak di-install terpisah.

## Bug yang ditemukan saat verifikasi & perbaikan

1. **Glass header bocor (ditemukan di screenshot Docs saat scroll).**
   Gejala: teks konten ("Confirmation of Payee…") terbaca menembus header.
   Akar masalah: build minifier membuang deklarasi `backdrop-filter`
   standar saat baris `-webkit-backdrop-filter` juga ditulis — CSS hasil
   build hanya berisi `-webkit-` yang tidak dihormati Chromium headless ini
   (computed `backdrop-filter: none`). Perbaikan: tulis HANYA properti
   standar di `globals.css` (toolchain menambahkan prefix sendiri) +
   background dinaikkan 0.85 → 0.94, blur 12px → 20px. Terverifikasi:
   computed `backdrop-filter: blur(20px) saturate(1.2)` aktif; piksel
   tergelap di area bleed naik 243 → 254/255 (ghost text hilang).
2. **Bug `AnimatedNumber` (ditemukan saat implementasi).** `mv.set(from)`
   yang konflik setelah `animate()` dihapus — `animate()` sudah mulai dari
   nilai saat ini.
3. **Mock toast salah posisi (kesalahan konstruksi mock, bukan app).**
   Mock awal menaruh `.toast` langsung di body; toast asli butuh wrapper
   `.toast-viewport` (fixed, bottom-center). Mock diperbaiki + di-re-shoot.

## Verifikasi

- `tsc --noEmit` bersih; `next build` lolos (8 route).
- Smoke test `next start` (fork Anvil dari testnet asli): 7/7 route 200.
- Fork Anvil: chain 440050, kode kontrak Invoice ada, block ~3.646.5xx.
  RPC testnet langsung tidak dijangkau Chromium headless (proxy), jadi
  verifikasi memakai fork lokal — dicatat jujur, bukan disembunyikan.
- Screenshot dibaca satu per satu (17 file): tidak ada layout rusak / teks
  terpotong. Mobile 390px: nav jadi satu baris scroll horizontal
  (`overflow-x: auto`, tanpa scrollbar) — "Docs" terjangkau dengan swipe,
  bukan terpotong.
- **Caveat jujur:** UI bayar invoice unpaid + layar sukses New invoice
  hanya terverifikasi lewat mock HTML dengan CSS hasil build (tidak ada
  invoice on-chain baru yang dibuat — sesuai aturan). Scroll-spy Docs
  diverifikasi di kode saja (screenshot di scroll 0). Receipt masih
  menampilkan "Looking up the payment transaction…" pada detik pertama —
  perilaku async normal halaman itu, bukan bug ronde 3.
- **Observasi (bukan bug ronde 3):** Activity default "Last 5k blocks"
  kini menampilkan "No invoice activity" karena invoice #6D6D-2639 sudah
  > 5.000 blok yang lalu; item muncul dengan "Last 20k blocks".
- Tidak ada push ke GitHub, tidak ada submit DoraHacks. Commit lokal saja.
