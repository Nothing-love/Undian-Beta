# AUDIT & PANDUAN LENGKAP OPERATOR DORPRIZE (UPDATE 18 JULI 2026)

Dokumen ini adalah panduan teknis resmi untuk sistem pengundian DORPRIZE. Berisi daftar file, arsitektur sistem, cara penggunaan, dan panduan keamanan.

---

## 1. DAFTAR FILE & FUNGSINYA

### FILE AKTIF (WAJIB ADA, JANGAN DIHAPUS)

| File | Fungsi |
|------|--------|
| **dashboard.html** | Halaman utama pengundian mesin slot (tampilan layar utama) |
| **setting.html** | Halaman pengaturan kategori target, import data, dan daftar hadiah |
| **adm1n.html** | Halaman khusus admin untuk mengatur target pemenang tersembunyi |
| **login.html** | Halaman masuk (login) untuk mengamankan akses ke sistem |
| **app.js** | Otak utama JavaScript — logika undian, pemetaan hierarki, import/export Excel |
| **style.css** | Semua desain gaya visual, layout grid responsif, dan animasi slot |
| **server.js** | Server utama Node.js Express (Port 8080) — mendukung auto-tunnel Ngrok |
| **.env** | Konfigurasi kredensial login admin dan token authtoken Ngrok |
| **admin_state.json** | Database target pemenang tersembunyi (dibuat & diperbarui otomatis) |
| **peserta_state.json** | Database peserta aktif hasil import Excel (dibuat & diperbarui otomatis) |
| **PANDUAN_OPERATOR.md** | Dokumen panduan ini |

---

## 2. ARSITEKTUR KEAMANAN & AKSES JARINGAN

```
                   [ Browser Klien / HP Pimpinan ]
                                 │
                   (Akses via rute bersih / login)
                                 │
                                 ▼
                     server.js (Port 8080)
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   Rute Bersih            Sanitasi Input           Auto Ngrok Tunnel
(/dashboard, /setting)   (Anti-XSS & Injection)    (Akses Publik Online)
```

### A. Pengamanan Rute (URL Enforce)
*   Aplikasi dilindungi dari percobaan bypass login. Permintaan langsung berkas statis `.html` (seperti `/dashboard.html` atau `/setting.html`) akan diintersep oleh middleware server dan dialihkan (*redirect*) ke rute bersih (`/dashboard` atau `/setting`).
*   Rute bersih dilindungi oleh modul autentikasi sesi. Pengguna wajib memasukkan nama user dan sandi di halaman `/login` terlebih dahulu. Setelah berhasil masuk, sesi disimpan secara aman (cukup sekali login untuk mengakses seluruh halaman).

### B. Proteksi Keamanan (Anti-Injection)
*   Sistem penyimpanan data menggunakan file JSON lokal (`peserta_state.json`), sehingga **100% kebal terhadap SQL Injection**.
*   Input form login disanitasi ketat di sisi server (menghapus karakter berbahaya `[<>'"&]`) dan dibatasi maksimal 50 karakter untuk mencegah serangan *Script Injection (XSS)* dan *Buffer Overflow*.

### C. Kredensial Login (.env)
Kredensial login disimpan secara fleksibel pada file `.env` di root direktori dan dapat diubah langsung sesuai kebutuhan:
*   `ADMIN_USERNAME=admin`
*   `ADMIN_PASSWORD=54t51b3r`

---

## 3. STRUKTUR HIERARKI PESERTA 3-TINGKAT

Sistem mendukung skema hierarki 3-tingkat pada data peserta untuk menyaring target pengundian secara presisi:
1.  **Jenis_Peserta:** Contoh: `VIP`, `Reguler`, `Karyawan`.
2.  **Grup:** Contoh: `Cabang Jakarta`, `Cabang Surabaya`.
3.  **Kelompok_Dalam_Grup:** Contoh: `Divisi IT`, `Divisi HRD`.

### Skema Kolom Template Excel
Ketika mengimpor data peserta, gunakan tombol **"Download Template Excel"** di halaman `/setting` untuk mendapatkan struktur kolom berikut:
*   `ID_Peserta` (wajib diisi, contoh: `PST-001`)
*   `Nama_atau_Angka` (nama lengkap atau nomor undian, contoh: `Ahmad Rizky` atau `1004`)
*   `Jenis_Peserta`
*   `Grup`
*   `Kelompok_Dalam_Grup`
*   `Status_Undian` (secara default terisi `Belum Diundi`)

---

## 4. MENJALANKAN SERVER & NGROK

### A. Cara Menjalankan Server
Buka terminal/Command Prompt di folder proyek, lalu jalankan perintah:
```bash
node server.js
```
Aplikasi akan dapat diakses secara lokal melalui tautan: `http://localhost:8080`

### B. Auto-Ngrok Tunnel (Akses Publik Online)
*   Jika di dalam `.env` diisi variabel `NGROK_AUTHTOKEN`, server secara otomatis membuka jalur akses publik online (tunnel) agar HP Pimpinan atau HP Operator dapat terhubung meski berada di luar jaringan lokal WiFi.
*   **Auto-Clean:** Sistem secara otomatis mematikan proses Ngrok lama yang menggantung di Windows sebelum menyalakan tunnel baru untuk menghindari pesan error akun limit.

---

## 5. TAMPILAN MESIN SPIN SLOT & DYNAMIC FONT-SIZE

*   **Pendeteksian Angka vs Nama:** Selama animasi spin acak berjalan hingga pemenang terpilih berhenti, sistem secara real-time mendeteksi jenis nilai yang diundi.
*   **Angka Murni (Huge Size):** Jika berupa angka murni (seperti nomor undian `"902"`), font diatur **super tebal (font-weight: 900)** dengan ukuran sangat besar (**11rem** untuk mode 1 pemenang, dan **3.5rem** untuk mode grid 6+ pemenang) agar memenuhi kotak slot dan terlihat jelas oleh penonton dari kejauhan.
*   **Nama Teks (Fitting Size):** Jika berupa nama teks alfabet panjang, ukuran font secara otomatis diturunkan menjadi **4rem** (untuk 1 pemenang) dan disematkan fitur *word-wrap* otomatis agar nama tidak keluar dari batas garis kotak.

---

## 6. EKSPOR HASIL UNDIAN MULTI-SHEET EXCEL

Tombol **"Simpan Excel"** (atau **"Export Excel"**) di dashboard akan menghasilkan berkas Excel hasil undian yang rapi dengan tiga bagian tab utama:
1.  **Sheet `Semua_Ronde`:** Rekap rekapitulasi seluruh pemenang dari awal hingga akhir, dilengkapi kolom terurai **Jenis Peserta**, **Grup**, **Kelompok**, **Hadiah** yang diperoleh, dan waktu pengundian.
2.  **Sheet `Ronde_X`:** Lembar khusus per-ronde (misal: `Ronde_1`, `Ronde_2`) berisi detail peserta yang keluar pada ronde bersangkutan beserta kolom **Hadiah** yang diperolehnya.
3.  **Sheet `Data_Peserta`:** Rekapitulasi database peserta saat ini beserta statusnya apakah "Belum Diundi", "Sudah Diundi", atau "Gugur".
