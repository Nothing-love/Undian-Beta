# RENCANA — DOORPRIZE v2.0 "Panggung Bebas" (Free‑Canvas Layout)

> Dokumen perencanaan. Belum ada kode yang ditulis.
> Tanggal: 2026‑08‑12 · Basis kode: `server.js`, `public/app.js`, `public/dashboard.html`, `public/setting.html`, `public/style.css`

---

## 0. Keputusan yang sudah dikunci
1. **Cakupan: Panggung Bebas penuh.** Semua elemen panggung (logo, judul, sub‑judul, gambar hadiah, nama hadiah, mesin slot, tombol spin, badge statistik, footer, latar/tema) bisa **digeser** dan **diubah ukuran** bebas.
2. **Lokasi edit: di halaman Pengaturan (`setting.html`).** Operator menata pada **kanvas preview 16:9** yang meniru dashboard, terpisah dari layar live → aman dari salah‑geser saat acara berlangsung.
3. **Langkah pertama: dokumen dulu** (file ini), belum menulis kode.

---

## 1. Tujuan versi ini
Mengubah panggung undian dari **layout terkunci** menjadi **kanvas bebas** yang bisa ditata sesuai tema tiap acara — geser ke mana pun, atur ukuran sesuka hati — dan **tampil identik di semua layar** (laptop operator maupun proyektor/TV, berapa pun resolusinya).

---

## 2. Kondisi sekarang (dasar refactor)
| Aspek | Kondisi | Lokasi |
|---|---|---|
| Layout panggung | **Terkunci** (flexbox): header 95px (logo kiri‑absolut, judul tengah), `#mainContent` = sidebar hadiah 280px + `#centerArea` (slot) | `style.css:398‑737`, `dashboard.html` |
| Kustomisasi tersedia | Tema/warna, font, ukuran & warna judul/sub, bentuk logo, filter BG, warna hadiah/slot, upload logo/BG/hadiah, preset winner modal | `setting.html`, `app.js:477‑638, 2921‑2963` |
| Penyimpanan | `data/settings_state.json` (objek `settings`) di server | `server.js:29‑58, 162‑191` |
| Sinkronisasi | Polling `GET /api/state` tiap **2 detik**; slice `settings` = last‑write‑wins | `app.js:358‑361`, `server.js:491‑528` |
| Gambar | Upload `POST /api/upload/image` → `public/uploads/` (di‑gitignore) | `server.js:424‑451`, `app.js:2968‑2990` |

Yang **dipakai ulang tanpa dibongkar:** pipeline `APP.settings` → `saveSettings()` (POST `/api/state`, `app.js:190‑218`) dan pipeline upload gambar. Fitur tata‑letak **ditambahkan di atasnya**, bukan menggantikannya.

---

## 3. Arsitektur inti: satu "Panggung" berskala
Bungkus seluruh isi dashboard dalam satu **`#stage` berukuran desain tetap 1920×1080 (16:9)**. Semua elemen jadi **absolute‑positioned di dalam stage**, lalu stage di‑`transform: scale()` agar pas di layar apa pun:

```js
const DESIGN_W = 1920, DESIGN_H = 1080;
function fitStage(stage) {
  const s = Math.min(innerWidth / DESIGN_W, innerHeight / DESIGN_H);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`; // stage: absolute; left/top:50%; 1920×1080
}
addEventListener('resize', () => fitStage(stage));
```

**Kenapa ini kunci semuanya:**
- Operator menata **sekali** di ruang 1920×1080; karena panggung hanya *di‑scale* (bukan reflow), hasilnya **persis sama** di 720p/1080p/4K — termasuk ukuran font, jarak, dan gambar.
- Koordinat drag/resize selalu berada di ruang tetap 1920×1080 → matematika sederhana & stabil.

**Pembagian peran dua panggung (sesuai keputusan "editor di Pengaturan"):**
- **Dashboard (`dashboard.html`)** = panggung **render‑only**. Hanya menampilkan `settings.layout` via `applyLayout()`; **tidak ada handle edit** di sini → tak mungkin tergeser saat live. Ikut berubah otomatis lewat sinkron 2 detik.
- **Editor (`setting.html`)** = **kanvas preview 16:9** (`#layoutEditorStage`) berisi tiruan elemen panggung + mesin drag/resize. Di sinilah operator menata. Karena editor & dashboard memakai **sistem koordinat & `applyLayout()` yang sama**, susunan di editor = persis yang tampil di dashboard.

---

## 4. Model data tata‑letak (ditambahkan ke `settings`)
```jsonc
settings.layout = {
  "version": 2,
  "stage": { "w": 1920, "h": 1080 },        // kanvas desain (bisa diganti mis. 16:10)
  "items": {
    "logo":     { "x":0.02,"y":0.03,"w":0.14,"h":0.10,"rot":0,"opacity":1,"z":30,"visible":true },
    "title":    { "x":0.30,"y":0.03,"w":0.40,"h":0.10,"rot":0,"opacity":1,"z":20,"visible":true },
    "subtitle": { "x":0.30,"y":0.12,"w":0.40,"h":0.05,"rot":0,"opacity":1,"z":20,"visible":true },
    "prize":    { "x":0.00,"y":0.18,"w":0.22,"h":0.70,"rot":0,"opacity":1,"z":10,"visible":true },
    "slot":     { "x":0.24,"y":0.20,"w":0.72,"h":0.55,"rot":0,"opacity":1,"z":10,"visible":true },
    "spin":     { "x":0.42,"y":0.80,"w":0.16,"h":0.09,"rot":0,"opacity":1,"z":25,"visible":true },
    "stats":    { "x":0.80,"y":0.90,"w":0.18,"h":0.06,"rot":0,"opacity":1,"z":25,"visible":true },
    "footer":   { "x":0.00,"y":0.95,"w":1.00,"h":0.05,"rot":0,"opacity":1,"z":5, "visible":true }
  }
}
```
- Koordinat **ternormalisasi 0–1** (fraksi terhadap stage) → aman bila ukuran desain berubah.
- `rot` derajat · `opacity` 0–1 · `z` urutan tumpuk · `visible` sembunyikan elemen tak terpakai.
- **Tanpa `layout`** → aplikasi memakai *default layout* yang meniru tampilan sekarang → **100% mundur‑kompatibel**.

---

## 5. Editor Tata Letak di halaman Pengaturan (UX)
Kartu baru **"Editor Tata Letak Panggung"** di `setting.html`, berisi kanvas 16:9 (`#layoutEditorStage`) yang merender tiruan panggung memakai isi nyata dari `APP.settings` (logo, teks judul, contoh gambar hadiah, warna tema).

Interaksi pada tiap elemen:
- **Drag** untuk memindah; **8 handle resize** (sudut/tepi) + **handle rotasi**.
- **Snap** ke grid & **garis bantu** (tengah‑X/Y, tepi antar‑elemen) untuk kerapian.
- **Keyboard:** panah = geser · `Shift+panah` = geser besar · `Del` = sembunyikan · `Esc` = batal pilih.
- **Panel properti** (numerik presisi): X · Y · W · H · rotasi · opacity · z‑index · kunci rasio · **Reset elemen ini**.
- **Toolbar:** `Snap on/off` · **Reset semua** · **Preset layout** · **Simpan Tata Letak** · **Batal**.

**Working copy anti‑ketimpa:** editor bekerja pada **salinan kerja lokal** `editorLayout` (bukan langsung `APP.settings.layout`). Sinkron 2 detik boleh memperbarui `APP.settings` di latar tanpa mengganggu; perubahan baru ditulis ke `settings.layout` **hanya saat "Simpan Tata Letak"** ditekan → `saveSettings()` → semua perangkat lain ikut berubah.

Mesin edit ditulis sebagai modul **vanilla JS baru `public/stage-layout.js`** (~300–400 baris, **Pointer Events** → mouse + sentuh sekaligus, di‑*batch* via `requestAnimationFrame`). **Tanpa library CDN** agar tetap jalan meski internet venue mati.

---

## 6. Elemen & perilaku resize per‑jenis
| Elemen | Saat kotak diperbesar/diperkecil |
|---|---|
| Logo, gambar hadiah, latar (BG) | Kotak = ukuran gambar (`object-fit: contain`/`cover`), rasio dapat dikunci |
| Judul, sub‑judul, nama hadiah | Ukuran font mengikuti kotak (slider ukuran yang sudah ada tetap berlaku) |
| Mesin slot, tombol spin, badge stats | Konten di‑`transform: scale` mengikuti kotak (tetap proporsional) |

Tiap elemen target di markup diberi penanda, mis. `data-stage-item="logo|title|subtitle|prize|slot|spin|stats|footer"`, agar `applyLayout()` dan editor menemukannya secara seragam.

---

## 7. Sinkronisasi & keamanan
- **Dashboard tak bisa tergeser saat live** karena tidak punya handle edit; ia hanya `applyLayout()` render‑only. Ini menghapus risiko utama versi WYSIWYG.
- **Editor pakai working copy** (§5) → sinkron 2 detik tidak menarik‑narik elemen saat operator menata.
- **Validasi server:** `normalizeSettings()` (`server.js:162`) diperluas untuk **membersihkan `layout`**: paksa tipe angka, klem `x/y/w/h` ke 0–1, klem rotasi/opacity, whitelist id elemen yang dikenal, batasi jumlah item, buang key asing. Pertahanan berlapis agar satu setting rusak tak merusak tampilan semua klien (walau hanya admin ter‑autentikasi yang bisa menulis).
- **Mundur‑kompatibel:** `DEFAULT_STATE.settings.layout = null`; klien lama mengabaikan `layout`; setelah deploy `update.sh`, semua klien memakai kode baru.

---

## 8. Rencana bertahap (boleh berhenti di milestone mana pun)
| Fase | Isi | File utama | Hasil |
|---|---|---|---|
| **0 — Fondasi panggung** | Bungkus konten dashboard ke `#stage` 1920×1080 + `fitStage()`; ubah header/main/footer jadi item absolut dengan *default layout* yang meniru tampilan kini | `dashboard.html`, `style.css`, `app.js` | Tampilan **sama** seperti sekarang, tapi kini berskala & siap ditata |
| **1 — Data & terapkan** | Skema `settings.layout` + `applyLayout()` (dipakai dashboard & editor) + validasi server + `buildDefaultLayout()` | `app.js`, `server.js` | Layout tersimpan & tersinkron |
| **2 — Editor + mesin drag/resize** | Kartu editor 16:9 di `setting.html`; `stage-layout.js` (pilih/drag/resize/rotasi, snap, garis bantu, keyboard); toolbar + panel properti; "Simpan Tata Letak" | `setting.html`, `stage-layout.js` (baru), `style.css` | Bisa menata bebas & menyimpan |
| **3 — Poles per‑elemen** | Opacity/rotasi/z‑order/show‑hide tiap item; kunci rasio; **Preset** ("Klasik", "Fokus Hadiah", "Panggung Lebar", "Minimalis") | `app.js`, `stage-layout.js` | Cepat & rapi untuk beragam tema acara |
| **4 — Robust & multi‑layar** | Uji lintas resolusi; **Import/Export layout JSON** (pola export admin `app.js:2883`); mode "layar penuh proyektor"; versi skema untuk migrasi | semua | Siap produksi di venue |

**MVP = Fase 0–2** sudah memenuhi permintaan inti: geser + ubah ukuran semua elemen, konsisten di semua layar.

> ✅ **STATUS Fase 0–4: SUDAH DIIMPLEMENTASIKAN (siap produksi).**
> - **Fase 0** (`d0c79da`) — `#stage` 1920×1080 + `fitStage()`; tampilan lama tetap identik, kini berskala.
> - **Fase 1** (`9a22f7a`) — `settings.layout` + `applyLayout()`/`buildDefaultLayout()` (`app.js`) + sanitasi `normalizeLayout()` (`server.js`, klem 0–1 & whitelist 8 id).
> - **Fase 2** — `public/stage-layout.js` (`LayoutEditor`: pilih/drag/resize/**rotasi**/snap/**garis bantu**/keyboard, working copy anti-ketimpa) + kartu **"Editor Tata Letak Panggung"** di `setting.html` + wiring di `app.js` (`initLayoutEditor()`, `getContent`, `onSave`→`saveSettings()`, `onUseDefault`→layout `null`) + gaya `.le-*` di `style.css`. Toolbar: Snap · Pakai Bawaan (Flex) · Reset Semua · **Simpan Tata Letak**. Panel properti: X/Y/W/H/rotasi/opasitas/z/kunci-rasio/tampil/reset-elemen. `npm run check` kini mengecek `stage-layout.js` juga.
> - **Fase 3** — poles per-elemen (opasitas/rotasi/z/show-hide + kunci rasio) sudah hadir di panel sejak Fase 2. Ditambah **Preset layout** di toolbar editor (`stage-layout.js`): **Klasik** (semua default), **Fokus Hadiah** (gambar hadiah besar di tengah), **Panggung Lebar** (mesin slot melebar), **Minimalis** (sembunyikan sidebar hadiah & statistik). `buildPreset()` mengisi field kosong dari `DEFAULT_POS` → tiap item selalu valid. Diterapkan ke working copy (belum permanen sampai "Simpan Tata Letak").
 - **Fase 4** — kesiapan produksi: **Import/Export layout JSON** di toolbar editor (`exportLayout` unduh Blob `.json`; `importLayoutFile` baca+`migrateLayout`→working copy; feedback via `onNotify`→toast). **Mode layar penuh proyektor** di dashboard (`#fullscreenBtn` + `initFullscreenToggle()` pakai Fullscreen API, pintasan `F`, tombol overlay redup di luar `#stage`). **Versi skema + migrasi**: `LAYOUT_VERSION=2` di klien & server; `migrateLayout()` mengklem nilai rusak & membuang id asing (pertahanan berlapis dengan `normalizeLayout` server yang membangun ulang tiap field).
>   - **Sudah lolos:** `npm run check` (3 file JS) + smoke-test mesin editor **28 asersi** (8 item, setLayout/getLayout, panel input, refreshContent, guides, 4 preset valid, minimalis hide prize+stats, applyPreset, migrateLayout klem/tolak/drop-id/bump-versi). **Belum (manual operator, §12):** uji lintas-resolusi nyata di proyektor & mutasi data live.

---

## 9. Perubahan file konkret
- **`dashboard.html`** — tambah pembungkus `<div id="stage">…</div>`; beri `data-stage-item="…"` pada elemen target; `<script src="stage-layout.js">` (untuk `applyLayout` bersama). Tanpa handle edit.
- **`public/style.css`** — `#stage` (absolute, 1920×1080, `transform-origin:center`), letterbox `body`; `.stage-item{position:absolute}`; gaya handle/outline/garis‑bantu editor; ubah `.header-left/#mainContent/#prizeSidebar/#centerArea` dari flex‑terkunci → item panggung.
- **`public/app.js`** — `applyLayout(stageEl, layout)`, `buildDefaultLayout()`, panggil dari `applyEventSettings()` (`app.js:730`) & `syncStateWithServer()` (`app.js:289`); simpan `settings.layout` via `saveSettings()`.
- **`public/stage-layout.js`** *(baru)* — mesin editor (drag/resize/rotate/snap/keyboard/preset) + fungsi render bersama.
- **`public/setting.html`** — kartu "Editor Tata Letak Panggung" (kanvas 16:9, toolbar, panel properti, preset, Import/Export).
- **`server.js`** — `DEFAULT_STATE.settings.layout = null`; perluas `normalizeSettings()` untuk sanitasi `layout`.

---

## 10. Risiko & mitigasi
| Risiko | Mitigasi |
|---|---|
| Refactor layout memicu regresi visual | Fase 0 khusus memastikan *default layout* identik dengan tampilan sekarang; uji sebelum lanjut |
| Editor tertimpa sinkron 2 detik | Editor pakai **working copy** `editorLayout`; tulis hanya saat Simpan |
| Teks panjang meluber di kotak kecil | Auto‑shrink/clamp + garis bantu batas kotak |
| Setting `layout` rusak/berbahaya | Sanitasi & klem di `normalizeSettings()` server |
| Venue tanpa internet | Mesin editor mandiri (tanpa CDN); gambar sudah lokal di `public/uploads/` |

---

## 11. Preset layout bawaan (Fase 3)
Disediakan sebagai JSON siap pakai agar operator cepat mulai: **Klasik** (tampilan sekarang) · **Fokus Hadiah** (gambar hadiah besar di tengah) · **Panggung Lebar** (slot melebar) · **Minimalis**. Operator pilih preset → lalu sesuaikan bebas.

---

## 12. Uji & rilis
- **Cek sintaks:** `npm run check` (sudah ada: `node --check server.js && node --check public/app.js`; tambahkan `public/stage-layout.js`).
- **Checklist manual:** tata di laptop → buka di resolusi proyektor (harus identik) · resize window · sinkron 2 perangkat · jalankan spin saat show · **Reset semua** · Import/Export layout.
- **Rilis:** lewat alur mereka `sh update.sh` (`git pull` → `pm2 reload`). Data & `public/uploads/` aman (di‑gitignore). Naikkan `version` `package.json` → **2.0.0**.

---

## 13. Tambahan: Pengaman Dua‑Password (Login Operator vs Panel Admin)

> **Catatan penting:** fitur ini **berbeda dari fitur layout**. Layout v2 hampir tak menyentuh backend/logika undian; pengaman dua‑password ini **memang mengubah backend & autentikasi** (sensitif keamanan). Keduanya independen dan bisa dikerjakan terpisah.

> ✅ **STATUS: SUDAH DIIMPLEMENTASIKAN & LULUS UJI (18/18 smoke test).** Ringkasan hasil implementasi:
> - Rahasia pindah ke **`data/auth_state.json`** (server-only, di-gitignore) — `loginPassword` + `adminPassword` terpisah; fallback ENV `ADMIN_PASSWORD` / `ADMIN_PANEL_PASSWORD`.
> - `POST /login` pakai `getLoginPassword()`. Unlock adm1n via **`POST /api/admin/unlock`** (server-side, flag sesi `adminUnlocked`, lockout 5×/30 dtk). Ganti password: **`POST /api/login-password`** (Pengaturan) & **`POST /api/admin/password`** (adm1n) — keduanya butuh password lama.
> - `GET/POST /api/admin` di-gate `requireAdminUnlocked`. Password **tak lagi disiarkan** ke klien (dibuang dari `normalizeAdmin`, `/api/admin`, dan slice `admin` di `/api/state`).
> - **Kompromi anti-rusak:** update *status* target saat spin/reset lewat **`POST /api/admin/status`** (butuh login saja, TIDAK butuh unlock) yang **hanya menyalin `status` ke target yang keanggotaannya identik** → operator tak bisa menambah/merekayasa target lewat sini. Persistensi pemenang tetap via jalur peserta (`syncPesertaDataToServer`), independen dari admin.
> - Migrasi otomatis saat boot: seed dari `admin_state.json.password` lama + ENV; `admin_state.json` dibersihkan dari field `password`.

### 13.1 Masalah pada model sekarang
- `/login` dan gate panel adm1n memakai **satu password yang sama** (`admin_state.json.password`).
- Password itu **dikirim ke semua klien** lewat `/api/state` → `APP.adminPassword` (`app.js:332, 407`), dan gate adm1n **hanya dicek di sisi klien** (`app.js:2496‑2498`) → bisa dibaca/di‑bypass operator. UI bahkan menampilkan default `admin2026` (`adm1n.html:329, 335`).
- Akibat: "password adm1n" **belum benar‑benar rahasia** dari operator.

### 13.2 Model target (dua rahasia terpisah)
| Password | Diketahui | Diubah di | Mengatur |
|---|---|---|---|
| **Login (luar)** | Operator | **Pengaturan** | Akses `/login` |
| **Panel Admin (dalam)** | Hanya dev | **Halaman adm1n** | Akses panel target (rig pemenang) |

### 13.3 Penyimpanan (server‑only)
- File baru **`data/auth_state.json`** — **tidak pernah** dikirim ke klien mana pun:
  `{ "loginPassword": "…", "adminPassword": "…", "updatedAt": 0 }`
- Fallback `.env` (hanya dev yang akses):
  - `ADMIN_PASSWORD` → fallback **loginPassword** (nama lama, tetap kompatibel).
  - `ADMIN_PANEL_PASSWORD` *(baru)* → fallback **adminPassword** (dev set di `.env` → benar‑benar dev‑only).
- `admin_state.json` **berhenti menyimpan & menyiarkan** password; hanya berisi `targets`.

### 13.4 Penegakan di server (inti keamanan)
- `POST /login` verifikasi ke **loginPassword** (timing‑safe, pakai `safeStringEqual` yang sudah ada `server.js:83`).
- Flag sesi baru **`req.session.adminUnlocked`**.
- Endpoint baru **`POST /api/admin/unlock`** `{password}` → `requireAuth` + banding timing‑safe ke **adminPassword** → set `adminUnlocked=true`. Tambah **rate‑limit/lockout** (jeda setelah N gagal) karena ini rahasia dev.
- Endpoint admin di‑gate `adminUnlocked` (bukan sekadar `requireAuth`):
  - `GET /api/admin` — kembalikan **targets saja**, TANPA password.
  - `POST /api/admin` — simpan targets.
  - **`POST /api/admin/password`** `{current, next}` — ganti password panel (di halaman adm1n), verifikasi `current` dulu.
- Endpoint baru **`POST /api/login-password`** `{current, next}` → `requireAuth`, verifikasi `current`, ubah **loginPassword** (dipakai dari Pengaturan). Password tak pernah dikembalikan ke klien.
- **Hentikan penyiaran password:** buang `password` dari `normalizeAdmin` (`server.js:262‑269`), `GET /api/admin` (`478‑480`), dan slice `admin` di `/api/state` (`491‑503`). Klien tak lagi memegang `APP.adminPassword`.
- **`/api/state` tetap mengirim `targets`** (dashboard butuh untuk menerapkan target saat spin) — lihat §13.6.

### 13.5 Perubahan klien
- **Pengaturan** (`setting.html` + `app.js`): kartu baru "Ubah Password Login (Operator)" — field password lama + baru → `POST /api/login-password`.
- **adm1n** (`adm1n.html` + `app.js`):
  - `handleAdminLogin()` → panggil `POST /api/admin/unlock` (bukan banding klien). Sukses → muat panel + ambil `targets` via `GET /api/admin`.
  - `changeAdminPassword()` → `POST /api/admin/password` (lama + baru). Judul UI jadi "Ubah Password Panel Admin (khusus Dev)".
  - Hapus ketergantungan `APP.adminPassword`; hapus petunjuk "Default: admin2026" (`adm1n.html:329, 335`) yang membocorkan.
  - `exportAdminConfig`/`importAdminConfig` (`app.js:2883‑2918`): berhenti menyertakan `password` (kini server‑only) → hanya `targets`.
- Buang `password` dari payload `saveAdminSettings`/`saveSettings` (`app.js:207‑210, 242‑245`).

### 13.6 Catatan jujur soal target (batas keamanan)
Dashboard menerapkan target saat spin dari `APP.adminTargets` (`app.js:1848, 1994`) → **targets tetap harus sampai ke klien dashboard** via `/api/state`.
- **Dijamin:** operator **tak bisa membuka panel adm1n** (lihat/ubah target atau ganti password panel) karena butuh password dev yang diverifikasi server & tak pernah dibagikan.
- **Tidak dijamin:** menyembunyikan **isi target** dari operator yang teknis (bisa mengintip trafik `/api/state`). Untuk itu perlu memindah **penentuan pemenang ke server** (server kirim pemenang, klien hanya animasi) — perubahan lebih besar, dicatat sebagai **opsi lanjutan**.

### 13.7 Migrasi (aman, tanpa mengunci diri sendiri)
- Saat boot, bila `auth_state.json` belum ada: seed `loginPassword` dari `admin_state.json.password` lama (login lama tetap jalan) & `adminPassword` dari `ADMIN_PANEL_PASSWORD` env atau nilai lama (dev lalu rotasi di halaman adm1n). Lalu hapus `password` dari `admin_state.json`.
- Perbarui **PANDUAN**: tambahkan `ADMIN_PANEL_PASSWORD` ke contoh `.env`; ingatkan ganti **kedua** password sebelum acara publik.

### 13.8 Urutan pengerjaan
Karena menyangkut keamanan, disarankan **prioritas**: dapat dikerjakan sebelum atau paralel dengan Fase 2. Urutan internal: server (13.3→13.4) dulu, lalu klien (13.5), lalu migrasi + PANDUAN (13.7).

---

## 14. Langkah berikutnya
Rencana ini (layout v2 **dan** pengaman dua‑password) menunggu persetujuan. Urutan eksekusi disarankan:
1. **Pengaman dua‑password** (§13) — keamanan, relatif kecil & terisolasi.
2. **Layout Fase 0 → 1 → 2** (MVP) — fondasi `#stage` berskala tanpa mengubah tampilan dulu.
3. **Layout Fase 3 → 4** — preset, import/export, uji multi‑layar.

Titik mulai paling aman untuk layout tetap **Fase 0**. Untuk keamanan, mulai dari **server (§13.3–13.4)** agar rahasia berhenti disiarkan lebih dulu.
