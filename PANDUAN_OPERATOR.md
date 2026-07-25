# Panduan Operator DOORPRIZE

## Struktur project

```text
doorprize/
├── server.js                 # Server Express, port 8082
├── slim.bat                  # Script 1-click launcher untuk Windows (CMD / Double Click)
├── slim.sh                   # Script 1-click launcher untuk Linux / VPS / OpenWrt
├── serve.ps1                 # Script 1-click launcher untuk Windows PowerShell
├── ecosystem.config.js       # Konfigurasi PM2
├── package.json
├── .env                      # Login, session secret, dan opsi tunnel
├── data/
│   ├── settings_state.json   # Pengaturan event; hanya menyimpan URL gambar
│   ├── peserta_state.json    # Peserta dan hasil undian
│   └── admin_state.json      # Pengaturan panel admin
└── public/
    ├── dashboard.html
    ├── setting.html
    ├── adm1n.html
    ├── login.html
    ├── app.js
    ├── style.css
    └── uploads/              # Logo, background, dan foto hadiah
```

File gambar tidak lagi disimpan sebagai Base64 di `localStorage` atau file settings. Browser mengirim file ke endpoint upload, server menyimpannya di `public/uploads`, lalu settings hanya menyimpan URL seperti:

```json
{
  "logoUrl": "/uploads/logo-123.jpg"
}
```

## Quick Start (1 Kali Jalan)

### A. Untuk Windows (Komputer Lokal):
Cukup **double-click** file **`slim.bat`** di File Explorer, atau jika lewat PowerShell / Terminal ketik:

```powershell
.\slim.bat
```

Atau menggunakan PowerShell script (bila permission diizinkan):
```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

### B. Untuk Linux / VPS / OpenWrt (Server Publik):
Jalankan perintah berikut di terminal server:

```bash
chmod +x slim.sh
./slim.sh
```

Atau menggunakan npm:
```bash
npm run slim
```

Script akan secara otomatis:
1. Memeriksa keberadaan Node.js.
2. Membuat file `.env` otomatis dengan `SESSION_SECRET` unik jika belum ada.
3. Membuat folder `data/sessions` & `public/uploads`.
4. Menginstall dependencies (`npm install`) jika belum ada.
5. Memvalidasi sintaks kode (`node --check`).
6. Menjalankan server otomatis.

---

## Konfigurasi Manual `.env`

```env
PORT=8082
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-kuat
SESSION_SECRET=ganti-dengan-random-secret-panjang
TUNNEL_PROVIDER=none
```

Buat session secret dengan:

```bash
openssl rand -hex 32
```

Jangan menyimpan `.env` ke repository publik.

## Instalasi

```bash
cd /home/doorprize
npm install
npm run check
```

Menjalankan langsung:

```bash
npm start
```

Aplikasi tersedia di:

```text
http://127.0.0.1:8082/login
```

## Menjalankan dengan PM2

```bash
cd /home/doorprize
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Setelah perubahan kode:

```bash
pm2 restart doorprize --update-env
pm2 logs doorprize
```

## Nginx reverse proxy

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

Lakukan pengujian lalu aktifkan HTTPS menggunakan konfigurasi yang berlaku di server Anda.

## Batas upload

Format yang diterima:

- JPG/JPEG
- PNG
- WEBP
- GIF

Ukuran maksimal setiap gambar adalah 10 MB. SVG tidak diterima untuk mengurangi risiko script yang tertanam di file.

## Data lama

Saat server pertama kali dijalankan, format lama berikut dimigrasikan otomatis:

- `logoBase64` menjadi `logoUrl`
- `bgBase64` menjadi `bgUrl`
- `winnerBgBase64` menjadi `winnerBgUrl`
- `prize.imageBase64` menjadi `prize.imageUrl`

Data settings yang sebelumnya tersalin di `peserta_state.json` juga dibuang agar tidak terjadi duplikasi beberapa megabyte.
