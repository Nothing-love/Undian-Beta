# AUDIT & PANDUAN LENGKAP DORPRIZE

Dokumen ini adalah panduan teknis resmi untuk sistem DORPRIZE. Berisi audit seluruh file, fungsi masing-masing file, cara penggunaan, dan panduan pengelolaan bug.

---

## 1. DAFTAR FILE & FUNGSINYA

### FILE AKTIF (WAJIB ADA, JANGAN DIHAPUS)

| File | Ukuran | Fungsi |
|------|--------|--------|
| index.html | ~26 KB | Halaman utama aplikasi web (tampilan di browser) |
| app.js | ~75 KB | OTAK UTAMA — semua logika undian, admin, UI |
| style.css | ~46 KB | Semua gaya visual/tampilan (warna, layout, animasi) |
| server.js | ~5.3 KB | Server Node.js alternatif (port 8080) |
| serve.ps1 | ~8.9 KB | Server utama (PowerShell, port 3000) — yang dijalankan operator |
| admin_state.json | ~216 B | Database target pemenang tersembunyi (dibuat otomatis) |
| peserta_state.json | ~53 KB | Database peserta yang sudah diunggah (dibuat otomatis) |
| PANDUAN_OPERATOR.md | — | Dokumen panduan ini |

---

### FILE SAMPAH (AMAN DIHAPUS)

File-file berikut adalah sisa perbaikan bug yang dilakukan AI. Sudah tidak dipakai.

| File | Keterangan |
|------|-----------|
| fix.ps1 | Skrip perbaikan bug lama (restore executeSpinMulti) |
| fix2.ps1 | Skrip perbaikan bug lama (hapus kode duplikat) |
| fix_stop.ps1 | Skrip perbaikan bug tombol STOP manual |
| update_spin.ps1 | Skrip perbaikan logika gugur + replacement spin |
| clean.ps1 | Skrip hapus baris duplikat di app.js |
| check_braces.ps1 | Skrip diagnostic cek keseimbangan kurung kurawal |
| fix_app.js | Skrip Node.js untuk restore fungsi di app.js |
| fix_code.txt | Potongan kode sementara untuk perbaikan |
| temp_replace.js | Potongan kode buildSlotReels versi lama |
| temp_prize_code.txt | Potongan kode hadiah versi sementara |
| temp_target.txt | Data target sementara (10 byte) |
| append.css | CSS toggle switch yang sudah dimerge ke style.css |
| powershell | File/folder tidak jelas, aman dihapus |

---

### FILE DATA (BISA DIHAPUS JIKA INGIN RESET)

| File | Keterangan |
|------|-----------|
| Database_Undian_2026-07-17.xlsx | File Excel peserta yang sudah diunggah |
| baru.xlsx | File Excel peserta cadangan |
| ~$baru.xlsx | File lock Excel sementara, aman dihapus |
| Hasil_Undian_Semua_Ronde.pdf | Hasil undian yang sudah di-download |

---

## 2. ARSITEKTUR SISTEM

```
serve.ps1 (port 3000)
  Menjalankan server HTTP
    Melayani file statis + API
      GET/POST /api/admin  --> admin_state.json
      GET/POST /api/peserta --> peserta_state.json

index.html <--> app.js <--> style.css
(Tampilan)    (Logika)    (Visual)
```

---

## 3. FUNGSI UTAMA DI app.js

| Fungsi | Kegunaan |
|--------|---------|
| handleSpin() | Dipanggil saat tombol SPIN diklik |
| executeSpinMulti(rules, count, isReplacement) | Menjalankan animasi dan proses undian |
| finishSpinMulti() | Dipanggil setelah animasi selesai |
| determineWinnersMulti(rules) | Menentukan siapa pemenangnya (termasuk logika target admin) |
| getAdminTarget(ronde, cluster) | Mengambil pengaturan pemenang tersembunyi dari admin |
| buildSlotReels(count, winners, isManual) | Membuat animasi slot mesin di layar |
| animateRandomizer(cell, winner, names, col, isManual) | Animasi nama berputar di setiap reel |
| highlightWinners() | Memberi highlight hijau pada pemenang |
| showWinnerModal(winners) | Menampilkan popup daftar pemenang |
| disqualifyWinner(idx) | Menggugurkan pemenang dan otomatis undian pengganti |
| triggerManualStop() | Menghentikan putaran saat Mode Stop Manual aktif |
| fireConfetti() | Efek confetti saat ada pemenang |
| updateUI() | Memperbarui tampilan statistik jumlah peserta, ronde |
| updatePrizeSidebar() | Memperbarui tampilan hadiah di samping kiri |
| saveAdminSettings() | Menyimpan pengaturan admin ke server |
| loadAdminSettings() | Memuat pengaturan admin dari server |
| appendHasilUndian(ronde, winners) | Mencatat hasil undian ke histori |
| updatePesertaStatus(winners) | Mengubah status peserta dari Belum Diundi ke Sudah Diundi |
| getAllPreviousWinners() | Mengambil semua pemenang sebelumnya agar tidak keluar 2x |

---

## 4. CARA MENJALANKAN SERVER

### Via CMD (DISARANKAN):
```
d:
cd \DORPRIZE
powershell -ExecutionPolicy Bypass -File serve.ps1
```

### Via PowerShell langsung:
```
cd D:\DORPRIZE
.\serve.ps1
```

Port utama  : 3000 (serve.ps1)
Port cadangan: 8080 (server.js, jarang dipakai)

---

## 5. CARA AKSES DARI BERBAGAI PERANGKAT

| Perangkat | URL |
|-----------|-----|
| Laptop utama | http://localhost:3000 |
| HP / Laptop lain (WiFi sama) | http://[IP-LAPTOP]:3000 |
| Remote Admin dari HP | http://[IP-LAPTOP]:3000/?rc=true |

Cara cari IP Laptop: Ketik ipconfig di CMD, cari baris IPv4 Address

---

## 6. FITUR ADMIN TERSEMBUNYI

Panel admin bisa diakses dari URL manapun (laptop maupun HP).

1. Login Admin: Klik ikon kunci di pojok kanan atas, masukkan password
2. Password default: admin2026
3. Fungsi admin:
   - Mengatur pemenang tersembunyi (siapa yang harus menang di ronde tertentu)
   - Melihat daftar peserta dari jauh
   - Memantau hasil undian secara real-time
   - Pengaturan disimpan otomatis ke admin_state.json

---

## 7. FITUR-FITUR APLIKASI

### Mode Undian Normal
- Tekan SPIN, sistem otomatis berhenti dan tampilkan pemenang setelah beberapa detik

### Mode Stop Manual
- Aktifkan toggle "Mode Stop Manual" di atas tombol SPIN
- Tekan SPIN, nama berputar terus tanpa batas
- Tombol berubah jadi STOP, tekan kapan saja untuk memberhentikan undian
- Cocok digunakan oleh pimpinan yang ingin kontrol penuh kapan undian berhenti

### Gugur Pemenang
- Di popup pemenang, klik tombol Gugur pada nama yang ingin digugurkan
- Sistem otomatis menandai peserta sebagai Gugur sehingga tidak bisa keluar lagi
- Sistem langsung mengundian 1 pengganti dari cluster yang sama
- Pengganti muncul di daftar pemenang yang baru

### Target Pemenang (Admin Hidden)
- Login sebagai admin, atur siapa pemenang di ronde berapa dan dari cluster apa
- Sistem akan memastikan nama tersebut keluar di ronde yang ditentukan
- Pengaturan ini tidak terlihat oleh operator biasa
- Status berubah menjadi "Sudah Dieksekusi" setelah dipakai

---

## 8. PANDUAN PERBAIKAN BUG

### Bug: Tombol tidak bisa diklik / website freeze
Penyebab: File app.js tidak berhasil dimuat karena ada SyntaxError
Solusi:
1. Buka browser, tekan F12 (Developer Tools), buka tab Console
2. Lihat error merah yang muncul dan catat nomor barisnya
3. Buka file app.js di nomor baris tersebut dan perbaiki sintaksnya
4. Refresh halaman

### Bug: Peserta dari HP tidak sinkron dengan laptop
Penyebab: Server tidak berjalan atau IP yang digunakan salah
Solusi:
1. Pastikan serve.ps1 sudah dijalankan di laptop utama
2. Pastikan HP dan laptop terhubung ke WiFi yang SAMA
3. Gunakan IP laptop yang benar, cek dengan perintah ipconfig di CMD

### Bug: Pengaturan admin tidak tersimpan
Penyebab: File admin_state.json mungkin rusak atau ada masalah izin file
Solusi:
1. Hapus file admin_state.json dari folder D:\DORPRIZE
2. Restart server (tekan Ctrl+C lalu jalankan ulang serve.ps1)
3. Buat ulang pengaturan admin dari panel

### Bug: Peserta hilang setelah restart browser
Penyebab: Data peserta disimpan di browser, bukan di server
Solusi: Upload ulang file Excel dari tombol Upload, atau cek peserta_state.json

### Bug: Nomor ronde tidak bisa direset
Penyebab: Data histori sudah tercatat di memori browser
Solusi: Klik tombol Reset Semua di bagian atas halaman

### Bug: Logo/emoji di tombol SPIN tampil rusak (contoh: dY=f atau karakter aneh)
Penyebab: Proses edit file via PowerShell merusak encoding UTF-8
Solusi: Edit index.html dan pastikan baris tombol spinBtn berisi emoji yang benar,
        yaitu: <span class="spin-icon">trophy emoji</span> SPIN

---

## 9. CARA BERSIHKAN FILE SAMPAH

Buka CMD di folder D:\DORPRIZE dan jalankan perintah berikut:

```
del fix.ps1 fix2.ps1 fix_stop.ps1 update_spin.ps1 clean.ps1 check_braces.ps1
del fix_app.js fix_code.txt temp_replace.js temp_prize_code.txt temp_target.txt
del append.css
del "~$baru.xlsx"
```

PERINGATAN: JANGAN hapus file berikut:
- index.html
- app.js
- style.css
- serve.ps1
- server.js
- admin_state.json
- peserta_state.json
- PANDUAN_OPERATOR.md

---

## 10. STRUKTUR FILE IDEAL (Setelah Dibersihkan)

```
D:\DORPRIZE\
  index.html           Halaman utama web
  app.js               Logika utama aplikasi
  style.css            Tampilan dan desain
  serve.ps1            Jalankan server (WAJIB)
  server.js            Server alternatif (opsional)
  admin_state.json     Data target admin (auto-generated)
  peserta_state.json   Data peserta (auto-generated)
  PANDUAN_OPERATOR.md  Panduan ini
  [file Excel]         Data peserta yang diimport
```

---

Panduan ini dibuat berdasarkan audit sistem DORPRIZE - Versi 17 Juli 2026
