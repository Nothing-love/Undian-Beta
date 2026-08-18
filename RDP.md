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

Memproduksikan **3 konsep HUD** yang sudah disetujui menjadi halaman nyata, dengan **satu bahasa desain HUD** (selaras dashboard) di seluruh aplikasi:

1. **Halaman Setting** (`public/setting.html`)
2. **Popup Pemenang** (modal di `public/dashboard.html` / dipakai app.js)
3. **Panel Admin — mobile** (`public/adm1n.html`)

Ditambah penyelarasan **Dashboard** & **Login** agar satu identitas.

**Bukan** ruang lingkup di sini: mengganti logika server/undian/sinkronisasi yang sudah jalan. Kita mengganti **kulit (UI) + beberapa UX**, mempertahankan alur data & endpoint.

---

## 2. Keadaan sekarang (dasar)

- **Stack:** Node + Express (`server.js`), sesi via `express-session`+file store, upload via `multer`, remote via `ngrok`, proses via `pm2`. Frontend statis di `public/`.
- **Frontend produksi:** `public/app.js` (~4348 baris), `public/style.css` (~4357 baris), + `setting.html`, `adm1n.html`, `dashboard.html`, `login.html`, `stage-layout.js`.
- **Font produksi sekarang:** Google Fonts **Inter/Outfit** (via `<link>` CDN). **Tema sekarang** default `professional_blue` (belum ada `komando`).
- **Perubahan belum di‑commit (harus direkonsiliasi di Fase 0):**
  - `public/setting.html` + `public/style.css` → konsep **lama** (kartu accordion + quick‑nav) — **arah berbeda dari HUD**, kemungkinan **di‑revert**.
  - `public/app.js` → wiring accordion/quick‑nav/dirty‑bar dari sesi lampau — juga arah lama.
  - `dasboard.png` (untracked) — screenshot, boleh diabaikan/ hapus.

> Keputusan Fase 0: revert 3 file di atas ke `HEAD` lalu bangun ulang berbasis HUD, **atau** pertahankan sebagian. Rekomendasi: **revert** (bersih, hindari campur dua konsep). Lihat §6.

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
| **Setting — HUD** | https://claude.ai/code/artifact/d88b998a-7ac0-4bbd-b87f-53f487a5cf0b | `setting.html` (+ `style.css`, `app.js`) | ✅ disetujui |
| **Popup Pemenang — HUD** | https://claude.ai/code/artifact/83810d33-b946-4883-a3bc-a3674eca52c2 | `dashboard.html` (modal) + `style.css` + `app.js` (`showWinnerModal`) | ✅ inti disetujui · ⏳ penyempurnaan adaptif >10 belum difinalkan (edit lokal belum di‑publish) |
| **Panel Admin — mobile HUD** | https://claude.ai/code/artifact/dad2fa86-36a5-4fa9-8f92-e7609f074506 | `adm1n.html` (+ `style.css`, `app.js`) | ✅ disetujui (v2: tanpa Filter Kategori) |

> Cara ambil isi artifact untuk porting: **WebFetch URL** → tersimpan sebagai file tool‑result → ambil bagian penulis (antara `<body>` … akhir, buang frame‑runtime). Untuk produksi, **jangan** inline font base64 — pakai CDN (§3.1).

---

## 5. Rencana bertahap (Fase) — boleh berhenti di tiap milestone

### Fase 0 — Fondasi sistem desain  🧱
- [ ] Putuskan & rekonsiliasi perubahan belum‑commit (revert `setting.html`/`style.css`/`app.js` ke `HEAD` — lihat §6/§2).
- [ ] Tambah font HUD (Bebas/Rajdhani/Teko) ke `<link>` semua halaman.
- [ ] Tambah token + kelas dasar HUD (`.card/.in`, corner‑bracket, `.btn2`, chip, dst.) ke `style.css` (blok baru, tak menimpa yang lain).
- [ ] Satukan `THEME_PRESETS` 8 tema + `applyTheme()` di `app.js` (default `komando`), set `data-mode`.
- **Selesai bila:** tema bisa di‑switch dan token tersedia global; halaman lama belum berubah tampilan drastis (aman).

### Fase 1 — Halaman Setting (HUD)  ⚙️
- [ ] Port struktur & gaya dari artifact Setting ke `setting.html` (kartu HUD, tipografi, kontrol).
- [ ] Sambungkan ke `app.js` yang ada (branding preview, tema, ronde/hadiah/target, keamanan, editor tata letak) — **pertahankan ID & fungsi** agar logika lama tetap jalan.
- [ ] Responsif mobile.
- **Selesai bila:** semua fitur setting berfungsi seperti sebelumnya, tampil HUD, tanpa regresi simpan/sinkron.

### Fase 2 — Popup Pemenang (HUD)  🏆
- [ ] Finalkan konsep adaptif **>10** di artifact dulu (edit lokal yang tertunda) → setujui.
- [ ] Terapkan markup/kelas HUD ke modal `#winnerModal` (dashboard) + `style.css`.
- [ ] Sesuaikan `showWinnerModal()` di `app.js`: mode hero/grid/roster otomatis dari jumlah + klasifikasi + preset latar + aksen tema. Pertahankan preset (`winnerBgPreset`) & tombol yang ada.
- **Selesai bila:** 1/4/>10 pemenang tampil rapi di proyektor, klasifikasi lengkap, preset & tema jalan.

### Fase 3 — Panel Admin mobile (HUD)  🎯
- [ ] Port `adm1n.html` ke layout HUD mobile‑first (login · panel target · pilih peserta).
- [ ] Sambungkan ke fungsi admin di `app.js` (login, target per‑hadiah, chip peserta, tabel→kartu target, ubah password). **Tanpa Filter Kategori** (sesuai v2).
- [ ] Target sentuh ≥44px, sticky header + aksi, aman‑notch.
- **Selesai bila:** alur target berfungsi penuh dari HP, nyaman satu tangan.

### Fase 4 — Konsistensi Dashboard & Login  🖥️
- [ ] Selaraskan `dashboard.html` & `login.html` dengan token/tema HUD (minimal: font, warna, tombol, header).
- **Selesai bila:** seluruh aplikasi terasa satu identitas.

### Fase 5 — Uji lintas perangkat & rilis  🚢
- [ ] `npm run check` bersih; uji manual desktop + HP (lihat §8).
- [ ] Uji 8 tema tak merusak keterbacaan (terang & gelap).
- [ ] Commit + tag + deploy sesuai `PANDUAN.md`.

---

## 6. Keputusan terbuka (perlu konfirmasi user)

| # | Keputusan | Rekomendasi |
|---|---|---|
| K1 | Cakupan adopsi HUD: **seluruh app** atau per‑halaman saja? | **Seluruh app** (konsisten) — Dashboard/Login ikut di Fase 4. |
| K2 | Perubahan belum‑commit (accordion) | **Revert** ke `HEAD`, bangun ulang HUD (hindari campur konsep). |
| K3 | Tema: **ganti** set tema lama dengan 8 tema HUD, atau gabung? | **Ganti** jadi 8 tema HUD (default `komando`). |
| K4 | Branding default | **Kopassus / 17 Agustus** sebagai contoh, tapi tetap bisa diubah via Setting. |
| K5 | Font | **CDN Google Fonts** di produksi (bukan inline base64). |

---

## 7. Papan Status  📊

- Fase 0 Fondasi — ⬜ belum
- Fase 1 Setting — ⬜ belum
- Fase 2 Popup Pemenang — ⬜ belum (konsep adaptif >10 ⏳)
- Fase 3 Admin mobile — ⬜ belum
- Fase 4 Dashboard/Login — ⬜ belum
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
