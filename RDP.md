# RDP — Rencana Detail Produksi: Konsep HUD → Produksi

> **Fungsi dokumen ini:** peta jalan produksi yang **bisa dilanjutkan lintas sesi**. Semua konsep sudah disepakati sebagai artifact; RDP ini menuntun cara memasukkannya ke aplikasi nyata (`server.js` + `public/*`), bertahap, boleh berhenti di milestone mana pun.
>
> Pendamping: [`RENCANA_V2.md`](RENCANA_V2.md) (fitur Panggung Bebas), [`PANDUAN.md`](PANDUAN.md) (deploy), [`README.md`](README.md).

---

## 0. Protokol Lanjut Per‑Sesi  ⟳  (BACA INI DULU tiap mulai)

Setiap sesi baru (context sudah kosong), kerjakan urutan ini:

1. **Baca RDP.md** (dokumen ini) — khususnya **§7 Papan Status** & **§5 Fase**.
2. Cari **tugas `- [ ]` pertama yang belum dicentang** pada fase aktif → itulah pekerjaan berikutnya.
3. Kerjakan **satu milestone** saja (jangan lompat), ikuti **§3 Sistem Desain** agar konsisten.
4. Uji: `npm run check` + uji manual (lihat **§8**). Untuk mobile, uji di lebar HP.
5. **Update RDP.md**: centang `- [x]` yang selesai, tambah baris di **§9 Log Perubahan** (tanggal + ringkas).
6. Commit (branch dulu bila di `main`). Jangan commit rahasia/`.env`/`data/`.

> Aturan emas: **RDP.md = sumber kebenaran**. Bila kode & RDP beda, perbarui RDP agar jujur.

---

## 1. Tujuan & ruang lingkup

Memproduksikan **4 konsep HUD** yang sudah disetujui menjadi halaman nyata, dengan **satu bahasa desain HUD** di seluruh aplikasi. **Urutan pengerjaan (alur ditetapkan user):**

1. **Dashboard** (`public/dashboard.html`) — panggung undian
2. **Popup Pemenang** (modal di dashboard / dipakai app.js)
3. **Halaman Setting** (`public/setting.html`)
4. **Panel Admin — mobile** (`public/adm1n.html`)

Plus **Login** (`public/login.html`) diselaraskan (pintu masuk, ringan).

**Bukan** ruang lingkup: mengganti logika server/undian/sinkronisasi/endpoint yang sudah jalan. Kita mengganti **kulit (UI)** saja + sedikit UX, mempertahankan alur data & `id` handler.

### 1.1 Prinsip wajib (governance) 🔒
1. **UI‑only.** TIDAK mengubah alur/logika yang sudah berjalan (undian, sinkron, endpoint, `id` handler). Fokus: ubah **tampilan** agar selaras.
2. **Audit Paritas tiap fase.** Sebelum menulis UI sebuah halaman, petakan **tiap elemen UI konsep → fungsi/`id` di `app.js` yang sudah ada**. Pertahankan `id`/atribut yang dipakai kode lama.
3. **Elemen tanpa logika = WAJIB DIDISKUSIKAN.** Bila konsep punya elemen/menu yang **belum ada logikanya**, atau logika lama tak punya UI‑nya → **berhenti & diskusikan dulu** dengan user. Jangan diam‑diam menambah UI palsu atau membuang fitur. Target: **nol miss** antara logika lama ↔ tampilan baru.

---

## 2. Keadaan sekarang (dasar)

- **Stack:** Node + Express (`server.js`), sesi via `express-session`+file store, upload via `multer`, remote via `ngrok`, proses via `pm2`. Frontend statis di `public/`.
- **Frontend produksi:** `public/app.js` (~4348 baris), `public/style.css` (~4357 baris), + `setting.html`, `adm1n.html`, `dashboard.html`, `login.html`, `stage-layout.js`.
- **Font produksi sekarang:** Google Fonts **Inter/Outfit** (via `<link>` CDN). **Tema sekarang** default `professional_blue` (belum ada `komando`).
- **Baseline sudah dibersihkan (2026-08-19):** perubahan accordion‑era di `setting.html`/`style.css`/`app.js` **di‑stash** (`git stash` — recoverable) → worktree = `HEAD` untuk file itu. Branch kerja: **`feat/produksi-hud`**.
  - `dasboard.png` (untracked) — screenshot, boleh diabaikan/hapus.

---

## 3. Sistem Desain HUD (referensi teknis — sumber tunggal)

Semua halaman produksi memakai token & pola ini (diambil dari konsep artifact).

### 3.1 Font
Bebas Neue (display), Rajdhani (tech/label), Teko (angka), Inter (UI).
- **Di produksi pakai Google Fonts CDN** (bukan inline base64 — inline hanya perlu di artifact karena CSP). Tambah ke `<link>`:
  `Bebas+Neue&Rajdhani:wght@500;600;700&Teko:wght@500;600;700&Inter:wght@400;600;700`
- Variabel: `--font-display / --font-tech / --font-number / --font-ui`.

### 3.2 Token warna (per‑tema, di‑set ke `:root`/wadah)
`--color-primary / -light / -dark / -rgb`, `--color-secondary(-rgb)`, `--color-accent(-rgb)`, `--color-bg / -bg-secondary / -surface`, `--color-text / -secondary / -muted`, `--color-border`.

### 3.3 Delapan tema (live‑switch, default `komando`)
`komando` (merah gelap, default) · `festive_red` · `professional_blue` · `gala_gold` · `nature_green` · `royal_purple` · `sunset_orange` · `midnight_dark`.
Nilai lengkap ada di tiap artifact (`THEMES` + fungsi `apply()`), **satukan ke `app.js` sebagai `THEME_PRESETS`** dan set `data-mode` (dark/light) untuk chrome halaman.

### 3.4 Pola komponen HUD
- Panel bersudut: `clip-path:polygon(...)` bevel + border gradient primary + **corner‑bracket** (::before/::after).
- Label = Rajdhani uppercase + letter‑spacing; angka = Teko `tabular-nums`.
- Tombol `.btn2` (gradient) / `.btn2.outline` / `.dash`.
- Status chip, tab‑accent, glow via `rgba(var(--color-primary-rgb),…)`.

### 3.5 Aturan khusus
- **Popup Pemenang selalu gelap sinematik**: tema hanya ubah **aksen** (border/glow/nomor); latar diatur **preset** (`gold/midnight/cyber/festival/custom`). Teks popup **hardcode terang** (`#fff/#eaf0f8`), bukan `--color-text` (agar terbaca di tema terang).
- **Adaptif jumlah pemenang**: 1 = hero (nomor raksasa) · 2–4 = grid · >4 = **roster multi‑kolom auto‑fit** dengan klasifikasi **Jenis · Grup · Kelompok**; sangat banyak → area kartu **menggulir** (judul & tombol tetap).
- **Mobile (Admin & umum):** satu kolom, target sentuh **≥44px**, header & aksi utama **sticky**, tabel → **kartu** (bukan scroll samping), hormati `safe-area-inset`.
- Aksesibilitas: `:focus-visible` terlihat, `prefers-reduced-motion` mematikan animasi dekoratif.

---

## 4. Aset konsep (artifact) → peta file produksi

| Konsep (artifact) | URL | File produksi target | Status konsep |
|---|---|---|---|
| **Dashboard — HUD** (v3, adaptif terang/gelap) | https://claude.ai/code/artifact/dc837248-5029-4af3-bd4e-d261e46d7b57 | `dashboard.html` (+ `style.css`, `app.js`) | ✅ disetujui |
| **Popup Pemenang — HUD** | https://claude.ai/code/artifact/83810d33-b946-4883-a3bc-a3674eca52c2 | `dashboard.html` (modal) + `style.css` + `app.js` (`showWinnerModal`) | ✅ inti disetujui · ⏳ penyempurnaan adaptif >10 belum difinalkan |
| **Setting — HUD** | https://claude.ai/code/artifact/d88b998a-7ac0-4bbd-b87f-53f487a5cf0b | `setting.html` (+ `style.css`, `app.js`) | ✅ disetujui |
| **Panel Admin — mobile HUD** | https://claude.ai/code/artifact/dad2fa86-36a5-4fa9-8f92-e7609f074506 | `adm1n.html` (+ `style.css`, `app.js`) | ✅ disetujui (v2: tanpa Filter Kategori) |

### 4.1 Hasil Audit Paritas Dashboard (2026-08-19) — SELESAI ✅

**Paritas cocok (konsep → produksi id/fungsi):** judul/sub‑judul (`#eventTitle`/`#eventSubtitle`) · peserta (`#pesertaCount`/`#pesertaBadge`) · ronde (`#rondeCount` + `#prizeRondeNumber`) · Pengaturan (`a[href="/setting"]`) · hadiah nama/gambar/**N Pemenang** (`#currentPrizeName` / `#currentPrizeImage`+placeholder / `.prize-card-count` ← `prize.count`) · slot+idle (`#slotMachine`/`.slot-idle`) · **Spin** (`#spinBtn`→`handleSpin()`) · **Stop Manual** (`#manualStopToggle`, dipakai `handleSpin`/`APP.manualStops`) · **Download Hasil** (`#downloadExcelBtn`→`downloadUpdatedExcel()`) · footer (`#appFooter`). → *Dua yang tadinya diragukan (Stop Manual, Download Hasil) ternyata SUDAH ada — bukan gap.*

**Keputusan gap (disepakati user):**
1. **Reset Undian** (`#resetUndianBtn`, logika ada, konsep tak menampilkan) → **tetap**, jadi ikon HUD di header (samping Pengaturan). *Logika tanpa UI — tak dibuang.*
2. **Swatch tema** → **hilangkan** dari dashboard (tema tetap dipilih di Setting; swatch di konsep hanya demo artifact).
3. **Teks brand** → **tambah**, sumber = **field baru opsional `settings.brandName` ("Nama Brand/Instansi") di Setting** (kosong → brand‑word disembunyikan). *Field additif, bukan mengubah logika lama.*
4. **Status text footer** (`#statusText`) → **tetap** ditampilkan.
5. **Layar Penuh** (`#fullscreenBtn`) → **tetap** tombol mengambang di luar `#stage`.

🔒 **Constraint (patuhi saat porting):** pertahankan `#stage` (skala 1920×1080) + atribut **`data-stage-item`** (logo/title/subtitle/stats/prize/slot/controls) agar **editor tata letak** (RENCANA_V2) tetap jalan; `#appFooter` & `#fullscreenBtn` tetap di luar `#stage`.

> Cara ambil isi artifact untuk porting: **WebFetch URL** → tersimpan sebagai file tool‑result → ambil bagian penulis (antara `<body>` … akhir, buang frame‑runtime). Untuk produksi, **jangan** inline font base64 — pakai CDN (§3.1).

---

## 5. Rencana bertahap (Fase) — boleh berhenti di tiap milestone

### Fase 0 — Fondasi sistem desain  🧱
- [x] ~~Rekonsiliasi perubahan accordion‑era~~ — di‑stash, baseline bersih di branch `feat/produksi-hud`.
- [x] **Tema `komando` ditambah** ke `THEME_PRESETS` (app.js) + jadi **default** (`APP.settings.theme` L46 & fallback `applyTheme`/`updateThemePreview`). 8 tema total. `npm run check` OK.
- [x] **Token font HUD** (`--font-display/tech/number/ui`) ditambah ke `:root` (style.css).
- [x] Font **Rajdhani + Teko** dimuat di `dashboard.html` (Bebas Neue sudah ada). Halaman lain menyusul saat port masing‑masing.
- [ ] **Kelas komponen HUD** (`.card/.in`, corner‑bracket, `.btn2`, chip, field, dst.) → ditambah **per porting halaman** (mulai Fase 1) agar teruji dalam konteks. Nol tabrakan nama terverifikasi di `style.css`.
- **Selesai bila:** tema bisa di‑switch & token/font tersedia; halaman lama tak rusak (`npm run check` OK ✅).

### Fase 1 — Dashboard (HUD) + Login  🖥️
- [x] **Audit Paritas** — SELESAI (§4.1). 5 gap diputuskan.
- [x] **Port HUD `dashboard.html`** — SELESAI & **teruji browser**. `body.hud` + blok "HUD DASHBOARD" di `style.css` (restyle chrome saja; internal reel `.slot-reel`/`.slot-cell` TAK disentuh). `id`/`data-stage-item`/`#stage` dipertahankan; Reset & status footer & fullscreen tetap; tanpa swatch tema. `npm run check` OK · nol console error · tema komando render benar (panel bersudut, corner‑bracket, font HUD, semua elemen ada).
- [x] **Brand‑word** header (`#hudBrand`/`#hudBrandName`) baca `settings.brandName` via `applyEventSettings` (sembunyi bila kosong). Field input dibuat di Fase 3.
- [x] **Fidelity v3 ke konsep dc837248** (blok CSS "HUD DASHBOARD v3" + 2 edit markup `dashboard.html`) — latar panggung (glow+grid+scanline, di‑skip saat `.has-bg`), crest bulat+cincin glow di logo, chip statistik **2‑baris** (angka Teko + label Rajdhani) + chip Ronde berkotak, art latar slot (kraken+skema SVG + vignette), pedestal hadiah + cincin, banner judul **Bebas Neue merah‑tema** + sub Rajdhani muted, idle‑title **solid** (matikan gradient‑clip base), tombol Spin lebih besar, header transparan (bukan bar), **titik status hijau** footer. Teruji **preview statis** (komando + data contoh) di browser: idle & loaded (1 hadiah) render sesuai konsep. *Keputusan:* judul/sub dashboard **dipaksa ikut tema (warna) + font HUD (Bebas/Rajdhani)** → picker warna/font per‑event tak lagi memengaruhi dashboard (masih berlaku di halaman lain); **bisa direvert bila diminta**.
- [x] **Login HUD** — `login.html` di‑restyle ke bahasa HUD (tema **komando fixed** pra‑auth; panel bersudut + corner‑bracket; Bebas/Rajdhani/Teko; input bersudut; tombol chevron "MASUK"; latar grid+scanline; footer Satsiber Kopassus). **Logika login 100% utuh** (form `action=/login` `method=POST`, `name=username`/`password`, `id` `#username`/`#password`/`#errorMsg`, skrip `?error=1`). UI‑only. Teruji preview `:8099` (termasuk state error).
- **Selesai bila:** dashboard tampil HUD tanpa regresi (✅ terverifikasi browser); login senada (belum).

### Fase 2 — Popup Pemenang (HUD)  🏆
- [ ] **Audit Paritas**: elemen modal → `showWinnerModal()`/`#winnerModal` yang ada.
- [ ] Finalkan konsep adaptif **>10** di artifact dulu (edit lokal tertunda) → setujui.
- [ ] Terapkan markup/kelas HUD ke `#winnerModal` + `style.css`; sesuaikan `showWinnerModal()` (mode hero/grid/roster dari jumlah + klasifikasi + preset latar + aksen tema). Pertahankan `winnerBgPreset` & tombol yang ada.
- **Selesai bila:** 1/4/>10 pemenang rapi di proyektor, klasifikasi lengkap, preset & tema jalan.

### Fase 3 — Halaman Setting (HUD)  ⚙️
- [x] **Audit Paritas** — SELESAI (uji browser): 71 `id` + fungsi (`saveEventSettings`/`openSettingsModal`/`addPrizeRule`/`applyTheme`/`initLayoutEditor`/`changeLoginPassword`/dll) hadir; semua panel (Excel, 8 tema, branding, kustomisasi, upload, popup, ronde/target, keamanan, editor tata letak) render HUD.
- [x] Port struktur & gaya dari artifact Setting ke `setting.html`; **`id` & fungsi dipertahankan** (UI‑only). + indikator "belum disimpan" (`setSettingsDirty`, chip `#saveStat` + `.floating-save-bar.dirty`).
- [x] Field opsional **"Nama Brand/Instansi"** (`settings.brandName`) — ada, ter‑populate, disimpan via `saveEventSettings` (dikonsumsi brand‑word dashboard).
- [x] Responsif mobile — aturan ada (`.settings-grid` 2‑kol → 1‑kol `@media ≤1024px`); **verifikasi lebar HP nyata ditunda ke Fase 5** (viewport otomasi terkunci 1536px).
- **Selesai bila:** semua fitur setting jalan seperti semula, tampil HUD, tanpa regresi simpan/sinkron. ✅

### Fase 4 — Panel Admin mobile (HUD)  🎯
- [ ] **Audit Paritas**: login admin · target per‑hadiah · chip peserta · tabel→kartu target · ubah password → fungsi `app.js` yang ada.
- [ ] Port `adm1n.html` ke layout HUD mobile‑first (login · panel target · pilih peserta). **Tanpa Filter Kategori** (v2).
- [ ] Target sentuh ≥44px, sticky header + aksi, aman‑notch.
- **Selesai bila:** alur target berfungsi penuh dari HP, tanpa regresi.

### Fase 5 — Uji lintas perangkat & rilis  🚢
- [ ] `npm run check` bersih; uji manual desktop + HP (lihat §8).
- [ ] Uji 8 tema tak merusak keterbacaan (terang & gelap).
- [ ] Commit + (merge ke main) + deploy sesuai `PANDUAN.md`.

---

## 6. Keputusan terbuka (perlu konfirmasi user)

| # | Keputusan | Rekomendasi |
|---|---|---|
| K1 | Cakupan adopsi HUD: **seluruh app** atau per‑halaman saja? | **Seluruh app** (konsisten) — Dashboard/Login ikut di Fase 4. |
| K2 | Perubahan belum‑commit (accordion) | ✅ Selesai: **di‑stash** (recoverable), baseline bersih. |
| K3 | Tema: **ganti** set tema lama dengan 8 tema HUD, atau gabung? | **Ganti** jadi 8 tema HUD (default `komando`). |
| K4 | Branding default | **Kopassus / 17 Agustus** sebagai contoh, tapi tetap bisa diubah via Setting. |
| K5 | Font | **CDN Google Fonts** di produksi (bukan inline base64). |

---

## 7. Papan Status  📊

- Fase 0 Fondasi — 🟨 tema komando+default ✅, token/font HUD ✅; kelas komponen menyusul per‑port
- Fase 1 Dashboard + Login — ✅ **SELESAI**: Dashboard HUD (`47fd124`: 8 tema adaptif, mode gambar‑latar sinematik, layout‑custom, fit teks panjang, banner sesuai konsep) + **Login HUD** (di‑commit sesudah ini). Teruji app nyata `:3000` + preview `:8099`.
- Fase 2 Popup Pemenang — ✅ **SELESAI**: Popup HUD (CSS‑only) + **roster‑ringkas** (wn‑lg 2‑kol / wn‑xl 3‑kol, konsep v‑20) + **dialog konfirmasi HUD gelap**. Teruji app nyata :3000 (1·4·20·30 pemenang, nama/kategori panjang).
- Fase 3 Setting — ✅ **SELESAI**: Setting di‑port ke HUD (panel bersudut, corner‑bracket, Bebas/Rajdhani/Teko, 8 tema, indikator "belum disimpan" `setSettingsDirty`, field **Nama Brand/Instansi**) + **latar = background upload operator** (scrim). Fix kustomisasi: nama hadiah dashboard honor warna/font; **remap Popup** (Warna Pemenang→nama, Warna Kategori→kategori). Teruji browser :3000 (paritas/dirty/warna hero&grid). UI‑only, logika `app.js` utuh.
- Fase 4 Admin mobile — ⬜ belum
- Fase 5 Uji & rilis — ⬜ belum

Legenda: ⬜ belum · 🟨 jalan · ✅ selesai.

---

## 8. Uji & rilis

- Sintaks: `npm run check` (server.js + app.js + stage-layout.js).
- Jalankan lokal: `npm start` → buka `http://localhost:<port>` (lihat `.env`/`server.js`).
- Uji manual per fase: **fungsi tidak boleh regresi** (simpan setting, spin/pemenang, target admin, sinkron antar‑perangkat).
- Mobile: uji lebar 360–414px (Admin & Setting), cek target sentuh & sticky bar.
- Remote: uji via ngrok bila perlu (banyak perangkat).

---

## 9. Log Perubahan (append tiap sesi)

- **2026-08-19** — RDP.md dibuat. Konsep HUD Setting/Popup/Admin sudah jadi (artifact). Belum ada kode produksi HUD yang ditulis. Menunggu konfirmasi K1–K5 sebelum Fase 0.
- **2026-08-19** — User konfirmasi K1–K5 (ikuti semua rekomendasi). Baseline dibersihkan: accordion‑era di‑stash di branch `feat/produksi-hud`, RDP.md di‑commit. Ditambah konsep **Dashboard** (artifact dc837248). Alur diurutkan ulang: **Dashboard → Popup → Setting → Admin** (+Login). Ditambah **§1.1 Prinsip wajib** (UI‑only + Audit Paritas + elemen tanpa logika wajib didiskusikan). RENCANA_V2.md sempat hilang dari worktree → dipulihkan (`git restore`).
- **2026-08-19** — **Fase 1: Dashboard di‑port ke HUD & TERUJI browser** (login manual user, :3000). `body.hud` + blok CSS "HUD DASHBOARD", brand‑word (`settings.brandName`) di `applyEventSettings`, font Rajdhani/Teko. Hasil: tema komando + panel bersudut + corner‑bracket + font HUD, semua elemen paritas ada, **nol console error**, internal reel tak disentuh. Sisa Fase 1: port `login.html`. (Belum di‑commit.)
- **2026-08-19** — **Fase 0 (fondasi) sebagian**: tema `komando` → `THEME_PRESETS` + default (app.js L46 + 2 fallback), token font HUD di `:root` (style.css), Rajdhani+Teko dimuat di `dashboard.html`. `npm run check` OK. Kelas komponen HUD ditunda ke porting per‑halaman. Belum di‑commit (per permintaan user).
- **2026-08-19** — **Audit Paritas Dashboard SELESAI** (read‑only, §4.1). Stop Manual & Download Hasil ternyata SUDAH ada; "N Pemenang" panel hadiah ada (`prize.count`). Keputusan 5 gap (disepakati user): Reset Undian tetap (ikon header) · swatch tema dihapus dari dashboard · teks brand via **field baru `settings.brandName`** di Setting · status footer & fullscreen tetap · constraint `#stage`+`data-stage-item` dicatat.
- **2026-08-19** — **Dashboard Fidelity v3** (agar "beneran mirip" konsep dc837248). Ditambah blok CSS **"HUD DASHBOARD v3"** (akhir `style.css`) + 2 edit markup `dashboard.html`: chip statistik jadi 2‑baris (`.chip-col`/`.rnd-num`) & div art latar slot (`.hud-slot-bg` kraken+skema). Menutup gap: latar panggung glow/grid/scanline (`#mainApp`, skip `.has-bg` agar gambar latar tetap tampil), crest logo, pedestal+cincin hadiah, banner judul Bebas merah‑tema + sub Rajdhani, idle‑title solid, Spin lebih besar, header transparan, titik status hijau footer. **Root cause judul biru/oranye:** `:root` set `--title/subtitle-color-event` (biru/oranye) & `applyEventSettings` set warna inline → di‑override lewat CSS `!important` (menang atas inline) memakai token tema. Verifikasi: **preview statis** (server 8099 sementara, sudah dibersihkan) — idle & loaded render sesuai konsep; `node --check` 3 file OK. **Belum di‑commit.** Sisa Fase 1: port `login.html`; opsional: crest untuk logo kustom, tagline brand 2‑baris.
- **2026-08-19** — **Dashboard Fidelity v4 (kalibrasi UKURAN ke konsep)** setelah user menandai ukuran/tulisan **kartu hadiah** & **mesin undian** belum sesuai. Akar: konsep pakai satuan container (cqw/cqh) sedang produksi pakai px/rem yang belum dikalibrasi ke kanvas 1920×1080 (1cqw≈19.2px). Blok CSS **"HUD DASHBOARD v4"**: panel hadiah **280→384px** (20cqw → "HADIAH RONDE" tak wrap), nama hadiah **28→41px**, label "Pemenang" **16→27px**, angka→36px, badge ronde→48px/33px; **mesin undian kini MENGISI kolom** (dulu `fit-content` → kotak kecil), idle "SIAP MENGUNDI" **120→142px** (7.4cqw), idle-sub→30px, tombol Spin **500→576px / 41,6→50px** (30cqw/2.6cqw). Art latar slot (kraken+skema) kini tampil penuh. Verifikasi preview browser: proporsi kartu & slot cocok konsep. **Murni CSS — tak ada logika/`id`/handler/reel yang diubah.** `node --check` OK. Belum di‑commit.
- **2026-08-19** — **Dashboard Fidelity v5 (kartu hadiah presisi)** setelah user menandai 3 hal: (a) kartu hadiah menyentuh batas bawah, (b) tulisan/penempatan "Hadiah Ronde" tak sesuai, (c) bentuk pill jumlah pemenang beda. Blok CSS **"HUD DASHBOARD v5"**: (a) kartu 1‑hadiah top‑weighted (`flex:0 1 auto` + `justify-content:flex-start` + `padding-bottom:28px`, `prize-card-img max-height:360px`) → ada ruang di bawah, tak menyentuh dasar; (b) header hadiah **center** + teks **solid** `--color-text` (matikan gradient‑clip `.prize-title-txt`) + **tab miring** (bukan bar tegak); (c) `.prize-card-count` diberi **ikon peserta** (SVG data‑uri `::before`) + `align-items:center` → bentuk = konsep `.win-pill`. Verifikasi zoom preview browser: cocok konsep. Murni CSS. `node --check` OK. **Catatan:** `style.css` di `dashboard.html` belum ber‑query‑versi → saat uji di app nyata mungkin perlu **hard refresh (Ctrl+F5)** agar CSS baru termuat (cache). Belum di‑commit.
- **2026-08-19** — **v5.1 (pedestal hadiah persegi)**: user tandai *latar/pedestal kartu hadiah terlalu tinggi*. Diukur langsung dari artifact (screenshot): pedestal konsep **~persegi (1:1)**, sedang produksi pakai `aspect-ratio:4/5` (1.25× lebih tinggi) + `max-height:360`. Fix: `body.hud .prize-single .prize-card-img { aspect-ratio: 1/1 }` → pedestal persegi seperti konsep; konten prize `justify-content:center` (panel produksi lebih tinggi dari konsep karena kontrol ada di kolom tengah, bukan di bawah body) → grup seimbang, tak menyentuh dasar & tak menggantung. Verifikasi zoom preview: pedestal 241×241 (1:1). Murni CSS. Belum di‑commit.
- **2026-08-19** — **v6/v7 (header/footer bersih + judul auto‑fit)** per permintaan user: (1) **hapus chip "Ronde Aktif"** — markup `#rondeBadge` dibuang (ronde tetap tampil di panel "HADIAH RONDE N"; `#rondeCount` JS null‑safe). (2) **hapus status "Siap…"** kiri‑bawah — `body.hud #statusText{display:none}` + footer `justify-content:flex-end` (elemen tetap ada utk JS). (3) **chip Peserta jadi 1 baris = tinggi tombol ikon 34px** — markup `<b#pesertaCount>+<small>` inline + blok CSS "HUD DASHBOARD v6". (4) **Judul & sub‑judul auto‑fit ke SATU baris** via skrip presentasional kecil di `dashboard.html` (`window.__fitTitles`: set `white-space:nowrap` lalu kecilkan font 50→22px (judul) / 22→11px (sub) sampai `scrollWidth` ≤ 1200/1040px ruang aman #stage; dijalankan saat load/resize/`fonts.ready` + `MutationObserver` agar re‑fit tiap `applyEventSettings` mengubah teks). Diuji preview dgn judul SANGAT panjang ("Acara Peringatan Detik‑Detik Proklamasi…Ke‑81 Tahun 2026") → tetap 1 baris, rapi, tak menabrak crest/chip, header tak jebol; judul pendek tetap besar (maks 50px). **UI‑only** — tak menyentuh logika undian/`id`/handler/reel; 3 file JS (`server/app/stage-layout`) tak diubah. Belum di‑commit.
- **2026-08-19** — **v8 (uji 8 tema + adaptif gelap/terang ala konsep)** per permintaan user (cek berbagai tema vs konsep). Diuji preview KE‑8 tema (komando, festive_red, professional_blue, gala_gold, nature_green, royal_purple, sunset_orange, midnight_dark): semua **adaptif** (tema terang → panggung terang + teks gelap; gelap → sebaliknya), aksen ikut tema, identitas HUD (chevron/corner/Bebas·Rajdhani·Teko) konsisten, teks terbaca. **Temuan:** produksi tak punya sinyal gelap/terang (`body.dark-theme` disebut di CSS tapi TAK pernah di‑set → aturan glass `has-bg` gelap = mati; poles idle/judul konsep tak bisa ditiru). **Fix:** `applyTheme` (app.js) kini set **`data-mode`(dark/light) dari luminance `colors.bg`** pada root — **sengaja BUKAN `body.dark-theme`** agar aturan reel `body.dark-theme .slot-reel` TETAP dorman (hormati constraint reel). Blok CSS **"HUD DASHBOARD v7"**: judul terang→`--color-primary` (kontras tegas), gelap→`--color-primary-light` (nyala); idle "SIAP MENGUNDI" gelap→`#f3f6fa` (spt konsep), terang→`--color-text`. Verifikasi terukur: gala_gold idle jadi near‑white (dulu emas), professional_blue judul jadi `#2563EB` (kontras naik). `node --check app.js` **OK**. **Ini 1 perubahan JS kecil pertama di `applyTheme` (UI‑only, presentasional — hanya set atribut; tak sentuh undian/sinkron/reel).** Belum di‑commit.
- **2026-08-19** — **v9 (mode latar‑gambar sinematik + cache‑buster)** — DIAGNOSIS di app **NYATA** (`localhost:3000`, bukan preview) atas laporan "preview cocok tapi nyata tidak". **Temuan:** (a) tema tersimpan user = **royal_purple (TERANG) + gambar latar (`has-bg`)** → kaca terang + teks gelap di atas gambar gelap = **washed & tak terbaca** (preview hanya uji komando tanpa gambar → gap ini lolos); (b) `style.css` **tanpa cache‑buster** → browser menyajikan CSS lama. **Fix:** blok CSS **"HUD DASHBOARD v9"** — saat `.has-bg`, HUD diperlakukan **SINEMATIK** apa pun temanya: panel kaca **gelap** + teks **terang** + aksen tema (idle/judul/sub/brand/chip/prize‑name di‑override terang; `#resetUndianBtn` juga di‑override karena id‑rule `background:surface` bikin putih di tema terang; banner judul/sub diberi backing gelap tipis). **Verifikasi LIVE** (reload nyata, tanpa injeksi): royal_purple + gambar kini crisp spt target — idle putih, tombol reset gelap, judul menonjol, pill/aksen ungu. + **cache‑buster** `style.css?v=2026.08.19.2` & `app.js?v=…2` di `dashboard.html` agar user selalu dapat versi terbaru (sebelumnya `style.css` tak ber‑versi → sumber utama "nyata ≠ preview"). Catatan: server dev `:3000` dijalankan Claude (background, `node server.js`); ada kedip singkat state default (komando/"DOORPRIZE") sebelum `loadSettings` async memuat setting tersimpan — normal. Belum di‑commit.
- **2026-08-19** — **v9.1 (banner judul/sub kembali ke gaya KONSEP)** — user: *latar judul & sub-judul tak sesuai konsep sama sekali*. Penyebab: v9 keliru memberi **backing gelap navy** pada `#eventTitle`/`#eventSubtitle` saat `.has-bg` (demi kontras di atas gambar), padahal konsep = **judul: chevron TINT PRIMARY + border primary + glow**; **sub: chevron SURFACE SOLID + border primary**. Fix: **hapus** override gelap v9 → banner mengikuti base v2/v3 (=konsep) di semua mode; warna sub kembali `--color-text-secondary` (terbaca di banner solid). Judul tetap `--color-primary-light` + text-shadow (agar teks terbaca di atas gambar, banner tetap gaya konsep). Verifikasi live (royal_purple + gambar): banner sesuai konsep. Belum di‑commit.
- **2026-08-19** — **v10 (banner judul/sub sesuai KONSEP saat layout‑custom + gambar)** — user tetap: latar judul/sub tak sesuai konsep. **Diagnosis via computed style di app NYATA** menemukan AKAR SEBENARNYA (bukan sekadar fill v9): user pakai **layout kustom (`#stage.stage-custom`) + gambar latar (`.has-bg`)**, dan aturan lama **`style.css` L3067** (`body.has-bg #stage.stage-custom #eventTitle,#eventSubtitle`) memberi **KACA PUTIH** (surface 62% + blur 12px + border putih + shadow polos) yang MENIMPA banner konsep (specificity (2,2,1) > `body.hud #eventTitle` (1,1,1)). **Fix:** blok **"HUD DASHBOARD v10"** dgn specificity lebih tinggi (`body.hud.has-bg #stage.stage-custom #eventTitle` = (2,3,1)) → kembalikan banner KONSEP: judul = gradient tint primary + inset border primary + glow; sub = surface solid + inset border primary; blur/border‑putih/radius dimatikan. **Verifikasi computed** (royal_purple): title bg `rgba(124,58,237,.18→.05)` + shadow `inset 2px .85 + glow 34px .22`; sub bg surface blend + inset 1px .5 → **PERSIS konsep**. Reload nyata (F5, cache‑buster dinaikkan ke `style.css?v=…3`) tampil benar. Pelajaran: fitur **editor tata letak** punya style sendiri utk item saat `.has-bg` — perlu diperhitungkan. Belum di‑commit.
- **2026-08-19** — **v10.1 (latar sub-judul GELAP di has-bg)** — user: latar sub-judul putih, konsep tidak. Sebab: banner sub = `color-mix(surface 78%, bg)` (konsep) yang **adaptif** → di tema TERANG (royal_purple/professional_blue) jadi **near-white**, jomplang di atas gambar sinematik gelap (konsep yg disetujui = komando/gelap → banner gelap). Fix: saat `.has-bg`, banner sub‑judul dipaksa **gelap** `rgba(9,12,19,.62)` + teks terang `#cdd7e3` + border primary (grup selector mencakup layout-custom & biasa). Verifikasi computed: subBg `rgba(9,12,19,.62)`, subColor `#cdd7e3`, titleBg tetap tint primary. Cache-buster → `style.css?v=…4`. Belum di‑commit.
- **2026-08-19** — **Fit judul/sub untuk KALIMAT PANJANG di LAYOUT CUSTOM** (permintaan uji user). Temuan (uji app nyata): user pakai **layout kustom** (`stage-custom`) → judul/sub punya **KOTAK ukuran tetap** (mis. 768px) + `overflow:hidden`. Skrip fit lama pas ke `maxW=1200` (bukan kotak) → teks panjang tetap 50px & **TERPOTONG dua sisi**. **Fix** skrip fit inline di `dashboard.html`: mode custom → pas ke **`clientWidth` (kotak)**; mode biasa → pas ke `maxW` (banner tumbuh ikut teks). + **`ResizeObserver`** pada `#eventTitle`/`#eventSubtitle` → re-fit TEPAT saat `applyLayout` set lebar kotak (atasi race timing yg bikin fit jalan sebelum box siap) + observer kelas `#stage` + pass tertunda (80..2200ms). Min font custom 16/10. **Verifikasi live (auto, tanpa panggil manual):** judul panjang realistis → **30px** fit kotak, sub → **14px** fit — **tak terpotong**. `dashboard.html` revalidate saat F5 (skrip inline; tak perlu cache-buster). Catatan: user aktif ganti tema saat uji (ungu→biru→oranye) — fix theme-agnostic. Belum di‑commit.
- **2026-08-19** — **Login HUD (selesaikan Fase 1)**. `login.html` di‑restyle ke bahasa desain HUD, senada Dashboard: token **tema komando** di‑set inline (app.js tak jalan pra‑auth), panel gelap bersudut (`clip-path`) + **corner‑bracket**, judul "DOORPRIZE" Bebas Neue + glow, eyebrow/label Rajdhani, input bersudut gelap (fokus glow), tombol **MASUK** chevron (Teko), latar radial‑glow + grid + scanline, footer Satsiber Kopassus. **UI‑only:** form (`action=/login`, `method=POST`), field `name=username`/`password`, `id` `#username`/`#password`/`#errorMsg`, & skrip `?error=1` dipertahankan → alur login server tak berubah. Font Bebas/Rajdhani/Teko ditambah ke `<link>`. Teruji preview `:8099` (redirect `/login`→`/dashboard` saat sesi aktif, jadi dipratinjau via server statis) termasuk state error. **Fase 1 (Dashboard+Login) TUNTAS.** Lanjut Fase 2 (Popup Pemenang).
- **2026-08-19** — **Fase 2: Popup Pemenang di‑port ke HUD (CSS‑ONLY).** Audit Paritas konsep `83810d33` ↔ produksi: SEMUA elemen konsep punya data/logika (nol gap "tanpa‑logika"). User koreksi 2 tampilan → **nomor tetap `#N` urut (2a)** & **klasifikasi tetap breadcrumb lengkap Jenis·Grup·Kelompok (2b)** → **`showWinnerModal()` TAK diubah**. Blok CSS **"HUD POPUP PEMENANG"**: panel bersudut + border primary + glow (buang bingkai emas/rounded), judul **Bebas putih** (buang gradient emas), sub **Rajdhani aksen tema**, kartu **bevel gelap + border primary**, badge `#N` Teko, nama Rajdhani terang, breadcrumb muted, tombol × merah, aksi **chevron** (Lanjutkan) + **outline** (Undi Ulang). **Mode adaptif `wn-sm/md/lg/xl`, preset `winner-preset-*`, respin, `fitWinnerName`, confetti DIPERTAHANKAN.** RDP §3.5 terpenuhi: gelap sinematik (preset=mood latar) + tema=aksen (teruji tema hijau + preset gold_gala). Diuji LIVE app nyata: **1 (hero) · 4 (grid) · 20 (roster)** — rapi. Cache‑buster → `style.css?v=…5`. **Belum di‑commit** (menunggu review). Catatan: roster banyak masih pakai **grid kartu** produksi (bukan baris‑ringkas konsep `v-20`) — opsi penyempurnaan bila diminta.
- **2026-08-20** — **Fase 2 LENGKAP: roster‑ringkas + dialog konfirmasi HUD → DI‑COMMIT.** (a) **Roster‑ringkas konsep `v-20`** untuk pemenang banyak/sangat‑banyak (mengganti caveat "grid kartu" entri sebelumnya): kartu `wn-lg`(≤24)/`wn-xl`(>24) jadi **BARIS RINGKAS** via `display:contents` pada `.winner-card-header` (buka nomor+klaster jadi item grid) + `grid-template-areas "num name"/"num cluster"` → **`#N` kiri (rentang 2 baris), nama kanan‑atas, breadcrumb kanan‑bawah**. `wn-lg` **2 kolom**, `wn-xl` **3 kolom** (responsif → 2/1 di layar sempit), `align-content:start` + `grid-auto-rows:minmax(44px,auto)` → **menggulir** bila melebihi layar (RDP §3.5). Nama 1‑baris (auto‑fit `fitWinnerName`), breadcrumb boleh 2‑baris, tombol × di‑tengah vertikal. **CSS‑ONLY** — `showWinnerModal`/mode/preset/nomor `#N`/breadcrumb TETAP. (b) **Dialog konfirmasi HUD** (`showCustomConfirm`, dipakai respin/reset dll): **+7 `className` hook** di `app.js` (**hanya hook gaya** — promise/resolve/animasi `opacity`+`transform` TAK disentuh) + blok CSS: panel **gelap sinematik** (`#141b2a→#0b0f18`, hardcode gelap + teks terang sesuai RDP §3.5, tema=aksen), bevel `clip-path`, border primary, judul Rajdhani aksen, tombol **YA** Teko‑chevron + **BATAL** outline. **Diuji LIVE :3000** (tema nature_green, di atas popup gelap): roster **20** (2 kol) & **30** (3 kol) nama+kategori panjang → semua muat tanpa scroll, auto‑fit rapi; dialog konfirmasi kini gelap‑HUD selaras. Mode kecil (hero/sm/md) tak tersentuh (selektor khusus `wn-lg`/`wn-xl`). Cache‑buster → `style.css?v=…7`, `app.js?v=…3`. **DI‑COMMIT (Fase 2 TUNTAS).** Lanjut Fase 3 (Setting).
- **2026-08-20** — **Fase 3: Setting di‑port ke HUD & TERUJI browser → DI‑COMMIT.** Port `setting.html` ke bahasa HUD (panel bersudut + corner‑bracket, Bebas/Rajdhani/Teko, 8 tema; **indikator "belum disimpan"** `setSettingsDirty` = chip `#saveStat` + `.floating-save-bar.dirty`, dipicu input/change/swatch; **field "Nama Brand/Instansi"** `settings.brandName` di `saveEventSettings`/`openSettingsModal`). **UI‑only** — `id`/handler & logika `app.js` (simpan/sinkron) tak diubah; +28 baris app.js murni presentasional. **Audit paritas browser** (:3000, login manual user): 71 `id` + semua fungsi hadir, semua panel render HUD, nol error load; uji dirty: ketik → "belum disimpan"/warn → reload discard (tak persist). **Perbaikan atas laporan user (CSS/label‑only):** (a) **latar Setting** kini = **background upload operator** + scrim gelap (`body.setting-page.has-bg`; dulu "kanvas bersih"); (b) **Kustomisasi Teks Hadiah** — nama hadiah dashboard kembali **honor `--prize-title-color` & `--prize-font-family`** (dulu dipaksa `#f3f6fa`/Teko oleh HUD `has-bg` di baris ~4082/4369), angka slot sudah jalan; (c) **remap warna Popup Pemenang** (permintaan user): **"Warna Pemenang"** (field lama reelNumberColor) → **semua nama pemenang** (`.winner-card-name` → `--reel-number-color`, hero & grid, ~4460), **"Warna Kategori"** (field lama winnerNumberColor) → **teks kategori** (`.winner-card-cluster` → `--winner-number-color`, ~4464), badge `#N` kembali default; label field + judul panel disesuaikan. Cache‑buster `style.css` → `2026.08.20.7`. Teruji live (probe computed + screenshot): nama kuning, kategori magenta, badge hijau — sesuai. **Data live tak berubah** (hanya 3 warna yg user ubah saat uji, auto‑save). Catatan: reel spin masih berbagi `--reel-number-color` (constraint reel dihormati); uji HP nyata ditunda Fase 5. Lanjut Fase 4 (Admin mobile).
