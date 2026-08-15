# PANDUAN — Instalasi Server Baru & Cara Update DOORPRIZE

> Catatan: file ini disimpan **lokal saja** (tidak di-push ke GitHub).
> Repo kode: `https://github.com/p4us-anakan/Undian-Beta`
> Prinsip penting: **kode ada di GitHub; data & gambar event hidup di server saja**
> (`.env`, `data/`, `public/uploads/` TIDAK ikut di repo — di-gitignore).

---

## A. INSTALASI DI SERVER BARU (Ubuntu 22.04 / 24.04)

### 1. Install prasyarat
```bash
# Node.js 18+ (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git

# PM2 (process manager) — opsional tapi disarankan untuk produksi
sudo npm install -g pm2
```
Cek: `node -v` (≥ v18), `git --version`.

### 2. Ambil kode dari GitHub
```bash
cd /home
git clone https://github.com/p4us-anakan/Undian-Beta doorprize-satsiber
cd doorprize-satsiber
```

### 3. Buat file `.env` (WAJIB — tidak ada di repo)
```bash
cat > .env <<EOF
PORT=8082
ADMIN_USERNAME=admin
ADMIN_PASSWORD=GANTI-DENGAN-PASSWORD-LOGIN-KUAT
ADMIN_PANEL_PASSWORD=GANTI-DENGAN-PASSWORD-ADM1N-KHUSUS-DEV
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
TUNNEL_PROVIDER=none
EOF
```
- **DUA PASSWORD TERPISAH (demi keamanan):**
  - **`ADMIN_PASSWORD`** — password **login** aplikasi (halaman `/login`). Boleh diketahui operator; dapat diubah operator lewat **Pengaturan**.
  - **`ADMIN_PANEL_PASSWORD`** — password **panel adm1n** (targeting). **Khusus dev**; dapat diubah di halaman **adm1n**. Buat berbeda dari `ADMIN_PASSWORD`.
  - Keduanya jangan pakai default `admin2026`; pakai yang kuat & berbeda.
  - Setelah pertama kali server jalan, nilai ini tersimpan ke `data/auth_state.json` (server-only, sudah di-gitignore). Perubahan password lewat UI menimpa file ini; ENV jadi fallback bila file belum ada.
- **`SESSION_SECRET`** — di-generate acak oleh perintah di atas (jangan dibocorkan).
- **`DORPRIZE_DATA_DIR`** *(opsional)* — lokasi folder data (default `<root>/data`). Isi bila ingin data di **volume terpasang** atau menjalankan **instance staging/uji terpisah** dari produksi. Contoh: `DORPRIZE_DATA_DIR=/var/lib/doorprize`. Bila diisi, yang di-**backup** adalah folder itu (bukan `data/` di dalam repo).

### 4. Install dependency & cek sintaks
```bash
npm install
npm run check
```

### 5. Jalankan aplikasi

**Cara cepat (otomatis — cek Node, buat .env bila belum ada, buat folder, install, jalan):**
```bash
sh slim.sh
```

**Cara produksi (PM2, disarankan):**
```bash
pm2 start ecosystem.config.js --update-env      # nama proses: doorprize-satsiber
pm2 save                                          # simpan daftar proses
pm2 startup systemd -u root --hp /root            # auto-start saat server reboot
```

### 6. Selesai — akses aplikasi
- Buka `http://IP-SERVER:8082/login`
- Login `admin` / `<password dari .env>`
- Masuk **Pengaturan** → upload Excel peserta (tombol Download Template dulu bila perlu).
- Folder `data/` dan `public/uploads/` dibuat otomatis saat server jalan.

### 7. (Sangat disarankan) HTTPS
Server via `http://` mengirim password & data **polos**. Pasang reverse proxy + sertifikat:
```nginx
server {
    listen 80;
    server_name doorprize.example.com;
    client_max_body_size 12m;
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Lalu aktifkan HTTPS (mis. `certbot --nginx`).

---

## B. CARA UPDATE (dari GitHub ke server)

Deployment adalah **git checkout**, jadi update cukup 1 perintah:

```bash
cd /home/doorprize-satsiber
sh update.sh
```

`update.sh` otomatis: cek GitHub → bila ada versi baru: `git pull` (fast-forward) → `npm install` (hanya bila `package.json` berubah) → cek sintaks → `pm2 reload doorprize-satsiber`. Bila sudah terbaru, berhenti tanpa restart.

- **Paksa deploy ulang:** `sh update.sh --force`
- **Manual (bila perlu):**
  ```bash
  git pull
  npm install
  npm run check
  pm2 reload doorprize-satsiber --update-env
  ```
- **Auto penuh (cron)** — cek tiap 5 menit, redeploy hanya bila ada update:
  ```bash
  # crontab -e
  */5 * * * * cd /home/doorprize-satsiber && sh update.sh >> data/update.log 2>&1
  ```

> **Aman:** `.env`, `data/`, `public/uploads/` di-gitignore → **tidak tersentuh** saat update. Data undian & gambar event tetap utuh.

---

## C. BACKUP (WAJIB — data event tidak ada di GitHub)

```bash
# Backup penuh
tar czf /root/doorprize-backup-$(date +%F-%H%M).tar.gz -C /home doorprize-satsiber
```
Minimal yang wajib di-backup: **`.env`**, **`data/`** (atau folder `DORPRIZE_DATA_DIR` bila diset), **`public/uploads/`**.
Restore: ekstrak tar, atau salin kembali ketiga item itu ke folder aplikasi.

---

## D. PERINTAH PM2 BERGUNA
```bash
pm2 status                          # lihat status
pm2 logs doorprize-satsiber         # lihat log
pm2 restart doorprize-satsiber      # restart
pm2 reload doorprize-satsiber       # reload (downtime minim)
pm2 stop doorprize-satsiber         # hentikan
```

---

## E. CATATAN PENTING
- File yang **harus ada di server tapi TIDAK di repo** (setup/backup manual): `.env`, `data/`, `public/uploads/`.
- Ganti **kedua** password default (`ADMIN_PASSWORD` login & `ADMIN_PANEL_PASSWORD` adm1n) & pasang **HTTPS** sebelum acara publik. Password panel adm1n cukup diketahui dev.
- Pertimbangkan **rate-limit** di `/login` untuk cegah brute-force.
- Untuk mencegah duplikat pemenang antar-perangkat, idealnya **spin dijalankan dari 1 layar** (sistem sudah mencegah duplikat, ini pengaman ekstra).

---

## F. CONTOH SETUP SAAT INI (referensi)
- Server   : `103.247.10.217`
- Folder   : `/home/doorprize-satsiber`
- Port     : `8082` → `http://103.247.10.217:8082`
- PM2 name : `doorprize-satsiber` (boot-persistent aktif)
- Update   : `cd /home/doorprize-satsiber && sh update.sh`
