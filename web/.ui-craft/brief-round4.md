# Brief — Redesign Ronde 4: Professional Polish + Anti-Slop Pass (Aevum Invoices)

Tanggal: 20 Nov 2026. Basis: commit `124c024` (ronde 3, live di Vercel).
Identitas visual dipertahankan penuh dari ronde 1–3: light Swiss ledger —
kertas `#F8FAFC`, navy `#1E3A5F`, hijau Paid `#059669`, IBM Plex Sans +
IBM Plex Mono. Tidak ada perubahan route, parameter URL, logika RPC/relayer/
EIP-712, atau fungsionalitas inti — hanya presentasi, copy, dan polish.
Tidak ada dependensi npm baru. Tidak ada invoice on-chain baru untuk testing.

## Hasil anti-slop — ringkasan angka

Detector: `npx -y @gessobuild/anti-slop check` (73 guard) pada 9 halaman
render (dashboard, dashboard-loading, detail invoice, receipt, activity,
activity-empty, setup, docs, new-invoice) dengan CSS hasil build yang
di-inline — jadi yang diperiksa adalah CSS sungguhan, bukan perkiraan.

| | Gating | Advisory |
|---|---|---|
| Sebelum (ronde 3) | 117 | 69 |
| Sesudah (ronde 4) | 41 | 42 |
| Selisih | −76 (−65%) | −27 |

Sembilan rule dibersihkan sampai 0x di semua halaman:
`gradient-fill`, `redundant-border`, `dark-glow`, `safe-green-default`,
`layout-prop-animation`, `hero-kicker-eyebrow`, `tiny-body-text`,
`em-dash-copy`, `nested-cards`.

Sisa gating 41x terbagi dua kelompok — keduanya keputusan sadar, bukan
yang terlewat (lihat tabel di bawah): 27x CSS vendor RainbowKit yang tidak
bisa diperbaiki dari source kita, dan 14x angka pengenal on-chain yang wajib
tetap eksak.

## Temuan anti-slop per rule id

### Diperbaiki (0x sesudah)

| Rule | Sebelum | Perbaikan |
|---|---|---|
| `gradient-fill` | 1x/halaman | `.spotlight-card::before`: radial gradient mengikuti kursor diganti tint datar `rgba(30,58,95,0.07)` (opacity saat hover). `SpotlightCard.tsx` disederhanakan: handler `onMouseMove` + custom property `--mx/--my` dihapus (sudah tidak dipakai — tanpa dead code). |
| `dark-glow` | 2x/halaman | `.btn:hover`: `box-shadow: 0 4px 14px rgba(30,58,95,0.18)` dihapus — feedback hover tetap ada lewat perubahan `background-color`. `.toast`: `box-shadow: 0 8px 24px rgba(15,23,42,0.25)` dihapus — toast adalah pill navy solid, terbaca tanpa bayangan. |
| `redundant-border` | 2x/halaman | `.filter-btn`: `border: 1px solid transparent` dihapus — sejak ronde 3 state aktif memakai sliding pill, border transparan itu sudah tidak menjaga apa-apa. `.code-copy` (tombol Copy di blok kode): `border: 1px solid rgba(255,255,255,0.18)` dihapus — tint putih 8% di atas blok gelap sudah cukup. |
| `safe-green-default` [advisory] | 3x/halaman | Tiga literal `#065f46` (`.metric.hero .metric-label`, `.metric.hero .metric-note`, `.notice.good`) diganti `var(--accent-text)` / `var(--good)` — hijau tetap token yang sama, kini satu token untuk semua teks hijau (kontras 5,0:1, tidak berubah). Literal `#059669`/`#047857` yang tersisa hanya ada di definisi custom property `:root` dan keyframe shadow — keduanya dikecualikan rule ini. |
| `layout-prop-animation` | 1x/halaman | Progress bar sync (`.progress > span` + `SyncProgress.tsx`): animasi `width` diganti `transform: scaleX()` dengan `transform-origin: left` — compositor-owned, tanpa reflow. Beam `::after` tetap di ujung isi karena ia menempel di sisi kanan span yang ikut ter-transform. Nilai di-clamp 0–1. |
| `hero-kicker-eyebrow` | docs, new-invoice, setup | Ketiga eyebrow dipertahankan + `data-slop-allow="hero-kicker-eyebrow"`: "Docs" (label navigasi), "New invoice · Aevum fork (local)" (konteks network form — mencegah salah jaringan), "Step 0 · Before you build" (posisi langkah dalam alur setup). Ketiganya membawa informasi, bukan dekorasi. |
| `tiny-body-text` | detail 1x, receipt 1x | Unit mata uang di angka besar: `font-size: 0.4em` → `12px` di `invoices/[invoiceId]/page.tsx` dan `receipts/[invoiceId]/page.tsx` (pilihan yang sama dengan auto-fix detector). Terlihat sebagai label unit kecil yang disengaja. |
| `em-dash-copy` | 10x (dashboard 1, detail 1, new-invoice 3, setup 3, docs 2) + 1x di new-invoice yang ketemu di putaran kedua | Semua em dash di copy terlihat diganti koma: lede dashboard, hint form (amount, due date), placeholder memo, kalimat "Past due", dan dua kalimat di docs. Sisa em dash di codebase hanya ada di komentar kode (bukan copy terlihat — detector tidak membacanya). |
| `nested-cards` | docs 5x, detail 1x | Docs 5x adalah **false positive**: "kartu luar"-nya adalah `<article class="docs-body">` yang dibaca detector sebagai kartu karena resolusi CSS-nya berbasis nama class — dua rule (inline-code chip dan checklist `li::before`) yang menyebut `.docs-body` dan punya radius+fill ikut menempel ke artikel. Artikel itu sendiri tidak punya surface apa pun. Perbaikan nyata: kedua rule di-scope ulang ke atribut `[data-docs]` (`<article data-docs>`), sehingga tidak lagi mencemari peta class. Detail 1x adalah kartu bersarang sungguhan (notice Paid di dalam kartu Payment) — pola yang disengaja (banner status di dalam panel, seperti semua design system), diberi `data-slop-allow="nested-cards"` pada kelima notice di kartu Payment + notice error di form New invoice. |

### Dibiarkan — dengan alasan (terdokumentasi, bukan terlewat)

| Rule | Sisa | Alasan |
|---|---|---|
| `transition-all` | 1x/halaman (9x) | Satu-satunya sumber: CSS vendor RainbowKit (`.ju367v8u{transition:all .125s}` — class utilitas internal mereka). Source kita tidak punya `transition: all` sama sekali (grep bersih). Meng-override class internal vendor yang hash-nya tidak stabil adalah hack rapuh — ponytail menolak. |
| `tight-line-height` | 1x/halaman (9x) | Sumber: RainbowKit `.ju367v1c{font-size:20px;line-height:24px}` (1,2 < 1,25). Sama: vendor, bukan source kita. |
| `bounce-easing` | 1x/halaman (9x) | Sumber: animasi modal RainbowKit `._9pm4ki5{animation:.35s cubic-bezier(.15,1.15,.6,1)}` (overshoot y=1,15). Sama: vendor. |
| `oversized-number` | 14x (dashboard 1, activity 4, setup 2, docs 7) | Semua adalah **pengenal eksak yang wajib tampil apa adanya**: nomor blok live (`Live · block 3650071`, blok event activity `3640082`/`3640069`) dan chain ID (`44005`/`440050`). Auto-fix detector akan menyingkatnya jadi "3.7M"/"44K" — itu merusak data di produk fintech (blok dan chain ID harus bisa disalin persis). Rule ini tidak punya opt-out per elemen (deteksinya teks mentah), jadi pengecualian dicatat di sini. |
| `fabricated-precision` [advisory] | 5x | Semua dari "#1" pada nama resmi event: "Aevum Builder Challenge #1". Bukan klaim buatan — itu nama acaranya. False positive. |
| `overstuffed-row` [advisory] | 35x (activity 2, setup 2, docs 31) | Baris tabel data, bukan "everything-row" marketing: baris activity butuh waktu+tipe+jumlah+hash+status; baris check setup butuh judul+nilai terukur+penjelasan+aksi; tabel docs butuh kolom-kolomnya. Genre yang memang padat — densitasnya adalah isi, bukan hiasan. |
| `multiline-row-meta` [advisory] | 2x (docs) | Sel tabel docs yang membungkus ke dua baris (alamat kontrak + penjelasan EIP). Tabel dokumentasi — wajar. |

Catatan kejujuran soal detector: `fix --write` dijalankan pada salinan dump
sebagai oracle untuk mempelajari rewrite persisnya (bukan diterapkan mentah
ke source — source kita TSX, fixer hanya bisa menulis HTML). Dua auto-fix
detector **ditolak sadar**: menyingkat nomor blok live jadi "3.7M" (merusak
data) dan menghapus "—" pada "Your balance" hingga sel jadi kosong (diganti
kata yang bermakna — lihat polish di bawah).

## Polish per halaman

**Dashboard** — Lede tanpa em dash ("…, or signs once and a relayer submits
it, …"). Memo kosong kini "No memo", bukan "—". Progress "Paid in" kini
scaleX (animasi lebih halus, tanpa reflow). Judul memakai `text-wrap:
balance`, paragraf `text-wrap: pretty`.

**Detail invoice** — "Your balance" kini tiga state yang jujur: "Not
connected" (wallet belum terhubung), "Switch network" (terhubung tapi di
chain yang salah), "Loading…" (terhubung, data belum tiba) — bukan lagi "—"
untuk ketiganya. Unit "tUSD8" 12px di samping angka besar. "Past due, but
still payable in full." (koma, bukan em dash). Kelima notice di kartu
Payment diberi opt-out nested-cards yang terdokumentasi.

**Receipt** — Unit "tUSD8" 12px. State loading transaksi diperbaiki (utang
ronde 3): "Looking up the payment transaction…" kini baru muncul setelah
scan berjalan 600ms — pada load cepat (kasus umum) baris itu tidak pernah
berkedip sedetik lalu hilang; pada load lambat ia tetap jujur muncul. Murni
tampilan — logika scan (`getLogsChunked`, 20k blok) tidak berubah.

**New invoice** — Eyebrow "New invoice · Aevum fork (local)" dipertahankan
(opt-out). Tiga hint + placeholder memakai koma. Fine print di bawah tombol
("Your client pays the invoice itself, in tUSD8, to your wallet.") juga
diperbaiki (ini yang ketemu di putaran verifikasi kedua).

**Setup** — Tiga baris idle kini "Not checked" (Network, Gas, tUSD8 balance)
— jauh lebih jelas daripada "—" saat wallet belum terhubung. Eyebrow
"Step 0 · Before you build" dipertahankan (opt-out).

**Docs** — Eyebrow "Docs" dipertahankan (opt-out). Dua em dash dihapus.
Aturan inline-code chip dan checklist di-scope ke `[data-docs]` (lihat
nested-cards di atas) — tampilan tidak berubah sedikit pun, diverifikasi
dengan screenshot klip tabel Network details: chip `44005`,
`https://rpc-test.qday.info`, `permit`, `name: "tUSD8"` tetap tampil dengan
background abu + border seperti sebelumnya.

**Activity** — Tidak ada edit konten; yang berubah adalah progress beam
(scaleX) dan hilangnya gradient/shadow/glow dari kartu — tampilannya sama
bersihnya, animasinya kini compositor-owned.

**Global** — `text-wrap: pretty` untuk `p, li, figcaption, blockquote`;
`-moz-osx-font-smoothing: grayscale` melengkapi `-webkit-font-smoothing`
yang sudah ada. Focus ring tetap 2px navy (`:focus-visible`) + ring 3px di
field — tidak diubah, sudah memenuhi kontras. `tabular-nums` sudah ada di
semua angka yang butuh (metric, receipt, check-value, score, total,
timeline amount) — diverifikasi, tidak ada yang kurang.

## Favicon (utang ronde 2–3 — SELESAI)

Tidak ada favicon sebelumnya → browser meminta `/favicon.ico` dan mendapat
404. Sekarang ada dua file (sesuai konvensi file Next.js 16, dibaca dari
`node_modules/next/dist/docs/.../app-icons.md`):
- `web/src/app/favicon.ico` — ICO asli 32×32 + 16×16 (digambar dengan PIL,
  supersample 4x): kotak navy `#1E3A5F` membulat + huruf "A" putih geometris
  + cakram hijau Paid `#059669` dengan centang putih.
- `web/src/app/icon.svg` — versi vektor yang sama (teks "A" IBM Plex Mono).
Head HTML kini memuat kedua `<link rel="icon">`; smoke test: `/favicon.ico`
200 (2.352 byte), `/icon.svg` 200 (451 byte).

## Perbandingan sebelum/sesudah (screenshot)

`redesign-shots-round4/compare-setup.png` — paling terlihat: tiga baris
"—" di ronde 3 menjadi "Not checked" di ronde 4.
`redesign-shots-round4/compare-invoice-detail.png` — "Your balance —"
menjadi "Not connected"; unit "tUSD8" lebih kecil dan disengaja.
`redesign-shots-round4/compare-dashboard.png` — lede berkoma; unit lebih
kecil; nomor blok live berubah (data live, bukan edit).
`redesign-shots-round4/docs-network-clip.png` — bukti chip inline-code
docs tetap tampil benar setelah re-scoping CSS.

Jujur soal visibilitas: ronde 4 adalah polish pada desain yang sudah bersih,
jadi sebagian besar perubahannya halus di screenshot diam — penghapusan
bayangan/glow/gradient hanya terasa saat hover, dan scaleX hanya terasa
saat progress bergerak. Yang kentara di gambar diam adalah copy yang
presisi (Not checked / Not connected / koma), favicon, dan unit 12px.
Itu memang sifat ronde ini: menghilangkan ciri "template AI" yang justru
paling kentara saat dipakai, bukan saat difoto.

## Skill yang dipakai

| Skill | Satu fungsi yang terlihat |
|---|---|
| `anti-slop` | Gerbang utama: `check` pada 9 halaman (sebelum 117 gating → sesudah 41), `fix --write` pada salinan dump sebagai oracle rewrite, lalu tiap rewrite diterapkan by hand ke source TSX/CSS dengan keputusan per rule (termasuk 2 auto-fix yang ditolak). Aturan dibaca dari `references/rules.md` + source detector (`dist/rules.js`) untuk memverifikasi sumber tiap hit (vendor vs source, false positive docs). |
| `ui-ux-pro-max` + `ui-craft` | Arah desain + token: semua perbaikan memakai token yang sudah ada (tidak ada warna/radius/shadow baru); brief + tokens tidak diubah. |
| `motion-design` + `motion` | Sistem motion ronde 3 dipertahankan penuh (`motion.ts`, komponen `motion/`); satu-satunya perubahan motion adalah scaleX pada progress bar (properti compositor, bukan layout) dan penghapusan handler mousemove yang sudah mati. |
| `ponytail` | Perubahan terkecil yang menyelesaikan tugas: tidak ada rewrite, tidak ada fitur baru, tidak ada dependensi baru; dua border mati dihapus (bukan ditambah), shadow dihapus (bukan diganti), handler mati dihapus. Saat "semaksimal mungkin" bentrok dengan minimalisme, yang dipilih adalah perbaikan terukur yang tercatat di brief ini (mis. tidak menambah dependensi untuk favicon — digambar dengan PIL yang sudah ada). |

## Skill yang sengaja tidak dipakai

- `framer-motion` (alias) — tidak ada animasi baru; yang dipakai adalah
  skill `motion` yang sama (satu library).
- `taste-skill` — tidak ter-install (repo 404, menunggu URL baru dari Junes);
  tidak relevan untuk polish ini.
- Skill animasi lain dari batch n01ennn (animejs, gsap, theatrejs, dsb.) —
  ronde ini tidak menambah animasi; menambah efek hanya demi efek adalah
  kebalikan dari anti-slop.

## Verifikasi

- `tsc --noEmit`: bersih (exit 0).
- `npm run build` produksi (config Aevum dari `.env.local`): lolos, 10 route
  (8 halaman + `_not-found` + `/api/relay` + `/icon.svg`).
- Build fork (Anvil lokal dari testnet asli — Chromium headless tidak bisa
  menjangkau RPC testnet langsung): lolos; `next start -p 3101` + smoke test
  200 di semua 7 route + `/favicon.ico` + `/icon.svg`.
- Screenshot desktop + mobile 390px semua halaman utama dengan data chain
  nyata (invoice #6D6D-2639 Paid) di `redesign-shots-round4/` (17 PNG +
  3 perbandingan + 1 klip docs); semuanya dibaca satu per satu: tidak ada
  layout rusak, teks terpotong, atau overflow horizontal. Nav mobile
  men-scroll horizontal sesuai desain ronde 2; placeholder input yang
  terpotong di ujung adalah perilaku normal input (bukan teks terpotong).
- Anti-slop re-check sesudah perbaikan: lihat tabel angka di atas
  (hasil lengkap: `/tmp/antislop-r4c-result.json`; hasil sebelum:
  `/tmp/antislop-r4-result.json`).

## Bug yang diperbaiki saat verifikasi

1. **Em dash ke-11 di new-invoice** — putaran check pertama masih menemukan
   1x em-dash di new-invoice: kalimat fine print "Your client pays the
   invoice itself — in tUSD8, to your wallet." (baris 280, terlewat di
   putaran pertama). Diperbaiki → koma; check kedua 0x.
2. **nested-cards docs tetap 5x setelah perbaikan pertama** — penyebabnya
   rule kedua yang mencemari peta class: `.docs-body ul.checklist
   li::before` (border 1,5px + radius 4px). Di-scope ulang ke `[data-docs]`
   seperti rule code-chip; check kedua 0x.

## Utang yang masih tersisa

- **RainbowKit vendor CSS (27 hit gating)**: `transition-all`,
  `tight-line-height`, `bounce-easing` 1x per halaman — di luar kendali
  source kita. Hilang hanya bila RainbowKit mengganti CSS-nya, atau bila
  connect wallet diganti komponen sendiri (di luar lingkup ronde ini).
- **Angka pengenal eksak (14 hit)**: nomor blok + chain ID tetap mentah
  dengan sadar — menyingkatnya adalah kesalahan faktual.
- **Advisory 42x**: `overstuffed-row` (tabel data), `multiline-row-meta`
  (sel tabel docs), `fabricated-precision` ("#1" nama event) — semuanya
  genre/false positive yang didokumentasikan di atas.
- **Unpaid pay UI + New-invoice success screen**: masih mock-only (tidak
  ada invoice on-chain baru untuk testing) — sama seperti ronde 2–3.
- **Activity default "Last 5k blocks" kosong** karena invoice #6D6D-2639
  sudah >5.000 blok (muncul di "Last 20k blocks") — perilaku yang benar,
  bukan bug.
- **DocsTagline mengetik**: screenshot mobile menangkap "Get p|" di
  tengah animasi ketik — itu animasi yang sedang berjalan, bukan teks
  terpotong.
