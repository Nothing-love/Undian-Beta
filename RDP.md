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

**Elemen UI Dashboard (untuk Audit Paritas §1.1):** brand/crest "KOMANDO", judul + sub‑judul acara, chip **Peserta Aktif** (mis. 1.550), tombol **Pengaturan** (→ setting) & **Layar Penuh**, panel **Hadiah Ronde** (nama hadiah · badge ronde · "N Pemenang" · gambar hadiah), **Mesin Slot** + state idle "Siap Mengundi", tombol **Spin Undian**, toggle **Stop Manual**, tombol **Download Hasil**, **swatch tema**. ⚠️ Verifikasi ke `app.js`: apakah **Stop Manual** & **Download Hasil** sudah ada logikanya — bila tidak → **diskusikan** (§1.1).

> Cara ambil isi artifact untuk porting: **WebFetch URL** → tersimpan sebagai file tool‑result → ambil bagian penulis (antara `<body>` … akhir, buang frame‑runtime). Untuk produksi, **jangan** inline font base64 — pakai CDN (§3.1).

---

## 5. Rencana bertahap (Fase) — boleh berhenti di tiap milestone

### Fase 0 — Fondasi sistem desain  🧱
- [x] ~~Rekonsiliasi perubahan accordion‑era~~ — **selesai**: di‑stash, baseline bersih di branch `feat/produksi-hud`.
- [ ] Tambah font HUD (Bebas/Rajdhani/Teko) ke `<link>` semua halaman.
- [ ] Tambah token + kelas dasar HUD (`.card/.in`, corner‑bracket, `.btn2`, chip, dst.) ke `style.css` (blok baru, tak menimpa yang lain).
- [ ] Satukan `THEME_PRESETS` 8 tema + `applyTheme()` di `app.js` (default `komando`), set `data-mode`.
- **Selesai bila:** tema bisa di‑switch dan token tersedia global; halaman lama belum berubah tampilan drastis (aman).

### Fase 1 — Dashboard (HUD) + Login  🖥️
- [ ] **Audit Paritas** (§1.1): petakan tiap elemen UI konsep Dashboard → `id`/fungsi `app.js`. Cek khusus **Stop Manual** & **Download Hasil** ada logikanya; yang tak ada → **diskusikan** sebelum lanjut.
- [ ] Port kerangka HUD ke `dashboard.html` (header/brand, panel Hadiah Ronde, mesin slot, kontrol Spin, footer) — **pertahankan `id` & hook** yang dipakai `app.js`/`stage-layout.js` (mesin slot, reel, spin, dll).
- [ ] Selaraskan `login.html` (pintu masuk) dengan token/tema HUD (ringan).
- **Selesai bila:** dashboard tampil HUD, undian/spin/sinkron **tanpa regresi**; login senada.

### Fase 2 — Popup Pemenang (HUD)  🏆
- [ ] **Audit Paritas**: elemen modal → `showWinnerModal()`/`#winnerModal` yang ada.
- [ ] Finalkan konsep adaptif **>10** di artifact dulu (edit lokal tertunda) → setujui.
- [ ] Terapkan markup/kelas HUD ke `#winnerModal` + `style.css`; sesuaikan `showWinnerModal()` (mode hero/grid/roster dari jumlah + klasifikasi + preset latar + aksen tema). Pertahankan `winnerBgPreset` & tombol yang ada.
- **Selesai bila:** 1/4/>10 pemenang rapi di proyektor, klasifikasi lengkap, preset & tema jalan.

### Fase 3 — Halaman Setting (HUD)  ⚙️
- [ ] **Audit Paritas**: tiap kontrol setting → `id`/fungsi lama (branding preview, tema, ronde/hadiah/target, keamanan, editor tata letak).
- [ ] Port struktur & gaya dari artifact Setting ke `setting.html`; **pertahankan `id` & fungsi**.
- [ ] Responsif mobile.
- **Selesai bila:** semua fitur setting jalan seperti semula, tampil HUD, tanpa regresi simpan/sinkron.

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

- Fase 0 Fondasi — 🟨 jalan (baseline bersih; tokens/fonts/tema belum)
- Fase 1 Dashboard + Login — ⬜ belum
- Fase 2 Popup Pemenang — ⬜ belum (konsep adaptif >10 ⏳)
- Fase 3 Setting — ⬜ belum
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
