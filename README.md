# 🎉 DOORPRIZE — Aplikasi Undian Digital

Aplikasi undian / doorprize berbasis web: mesin slot beranimasi, undian multi-ronde
per kategori, sinkronisasi antar-perangkat, tata letak panggung bebas, dan panel
target pemenang (khusus developer).

> **Repo ini sengaja KOSONG dari data undian.** Semua data acara (peserta, hasil,
> gambar, kredensial) hidup di server saat aplikasi dijalankan dan **tidak** ikut
> di-commit. Mulailah dengan data Anda sendiri.

---

## ✨ Fitur
- Undian **multi-ronde** dengan aturan per kategori (Jenis / Grup / Kelompok).
- **Beberapa hadiah dalam satu ronde** (mis. 30 TV + 20 Botol Air): sekali SPIN langsung
  menentukan siapa dapat apa — popup, histori, dan export Excel mencantumkan hadiah tiap pemenang.
- **Katalog hadiah** di dashboard untuk ronde dengan ≥4 jenis hadiah: satu gambar spotlight
  bergiliran + daftar ringkas yang menggulir sendiri (tidak menumpuk walau gambar berbeda-beda).
  Hadiah tanpa foto tampil sebagai ikon 🎁 besar; ronde tanpa foto sama sekali menampilkan
  nama hadiah sebagai judul sorotan & daftar yang lebih panjang.
- **Undian dihitung di server** (`draw.js`): anti-duplikat, ronde yang sudah diundi ditolak
  (aman walau SPIN ditekan dari dua perangkat), sinkronisasi multi-perangkat (polling tiap 2 detik).
- Target pemenang (panel adm1ndev) **tak pernah dikirim ke layar undian** — hanya panel yang
  sudah di-unlock yang bisa membacanya; target menempel pada HADIAH, ikut ke ronde mana pun hadiah dipindah.
- Impor peserta via **Excel**, ekspor hasil ke **Excel** (ada tombol Download Template).
- Kustomisasi **tema, logo, background**, dan **tata letak panggung** (geser & ubah ukuran).
- **Modal pemenang** dengan konfeti; nama panjang menyesuaikan otomatis (tak terpotong).
- **Panel adm1ndev** (khusus dev) untuk mengatur target pemenang per ronde.

---

## 📋 Prasyarat
- **Node.js 18+** dan **npm**

## 🚀 Instalasi & Menjalankan
```bash
git clone https://github.com/p4us-anakan/Undian-Beta doorprize
cd doorprize
npm install
cp .env.example .env        # lalu edit .env (WAJIB: ganti password & SESSION_SECRET)
npm start                   # atau: sh slim.sh  (otomatis: cek Node, buat folder, jalan)
```
Buka **http://localhost:3000/login**

Folder `data/` dan `public/uploads/` dibuat otomatis saat server pertama kali jalan.

---

## 🔑 Kredensial Default

> ⚠️ **WAJIB diganti sebelum dipakai untuk acara publik.**

| Akses | Halaman | Username | Password default |
|---|---|---|---|
| **Login operator** | `/login` | `admin` | `admin2026` |
| **Panel Admin** (target pemenang, khusus dev) | `/adm1ndev` | — | `admin2026` |

Nilai default ini dipakai **hanya bila** belum diatur lewat `.env` atau file
`data/auth_state.json`. Disarankan membuat password login & panel **berbeda**.

### Cara mengganti kredensial
- **Username** → set `ADMIN_USERNAME` di `.env`.
- **Password login** → menu **Pengaturan** di aplikasi (butuh password lama), atau `ADMIN_PASSWORD` di `.env`.
- **Password panel adm1ndev** → halaman **/adm1ndev** (butuh password lama), atau `ADMIN_PANEL_PASSWORD` di `.env`.

### Sesi login
Sesi berakhir otomatis bila **tidak ada aktivitas** (klik/ketik/gerak/sentuh) selama
`SESSION_IDLE_MINUTES` menit (default **30**, atur di `.env`), dan saat browser ditutup.
Sinkron otomatis tiap 2 detik tidak dihitung sebagai aktivitas. Halaman yang sesinya
habis otomatis kembali ke Login.

Perubahan lewat UI disimpan ke `data/auth_state.json` (server-only, tidak di-commit).
Setelah file itu ada, password di `.env` **tidak menimpa** `auth_state.json` — `.env` hanya *fallback* bila file belum berisi password. Server menuliskan peringatan di konsol bila keduanya berbeda.

---

## 🗂️ Data & Privasi (tidak ada yang bocor ke repo)
Item berikut **di-gitignore** dan dibuat otomatis / lokal di server:
| Item | Isi |
|---|---|
| `.env` | Konfigurasi & rahasia (password, session secret) |
| `data/` | Peserta, hasil undian, target, sesi, `auth_state.json` |
| `public/uploads/` | Logo, background, gambar hadiah |

**Backup** cukup menyalin tiga item di atas. Untuk pindah/restore, salin kembali ke folder aplikasi.

---

## 🔒 Checklist Keamanan (sebelum acara publik)
- [ ] Ganti **kedua** password default dan `ADMIN_USERNAME`.
- [ ] Isi `SESSION_SECRET` acak: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- [ ] Pasang **HTTPS** (reverse proxy Nginx + sertifikat) — HTTP mengirim password polos.
- [ ] Jalankan spin dari **satu layar** operator (pengaman ekstra anti-duplikat).

---

## 🧭 Alur Kerja Singkat
1. **Login** → **Pengaturan** → upload Excel peserta (atau Download Template dulu).
2. Atur **hadiah per ronde** (nama, jumlah pemenang, kategori).
3. *(Opsional, khusus dev)* buka **/adm1ndev** → atur target pemenang per ronde.
4. **Dashboard** → tekan **SPIN**. Ekspor hasil ke Excel kapan saja.

---

## 🚢 Deploy & Update (produksi)
```bash
# Jalankan dengan PM2
pm2 start ecosystem.config.js --update-env
pm2 save

# Update dari GitHub (git pull -> npm install bila perlu -> reload)
sh update.sh
```
`.env`, `data/`, dan `public/uploads/` **tidak tersentuh** saat update.

---

## 🧱 Struktur Proyek
```
server.js              # Backend Express (API, auth, sinkronisasi)
draw.js                # Mesin undian server (pemenang, target, gugur, reset)
public/
  dashboard.html       # Layar undian (SPIN)
  setting.html         # Pengaturan (peserta, hadiah, tema, tata letak)
  adm1ndev.html        # Panel target pemenang (khusus dev)
  login.html           # Login (tema mengikuti tema acara)
  theme.js             # Token warna tema (dipakai semua halaman)
  app.js               # Logika klien (undian, UI, sinkronisasi)
  stage-layout.js      # Editor tata letak panggung
  style.css
.env.example           # Contoh konfigurasi
```

## 📄 Lisensi
ISC
