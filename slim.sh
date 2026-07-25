#!/bin/sh
# DOORPRIZE - 1-Click Startup & Deploy Script (slim.sh)

set -e

# Pindah ke direktori script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "  DOORPRIZE - Automatic Launcher (slim.sh)"
echo "========================================="

# 1. Cek Node.js
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Error: Node.js belum terinstall. Silakan install Node.js terlebih dahulu."
    exit 1
fi

echo "✅ Node.js terdeteksi: $(node -v)"

# 2. Cek/Buat file .env jika belum ada
if [ ! -f ".env" ]; then
    echo "⚙️ Membuat file .env otomatis..."
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "secret-doorprize-$(date +%s)")
    cat <<EOF > .env
PORT=8082
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin2026
SESSION_SECRET=$SECRET
TUNNEL_PROVIDER=none
EOF
    echo "✅ File .env berhasil dibuat."
fi

# 3. Buat folder direktori data dan upload jika belum ada
mkdir -p data/sessions public/uploads

# 4. Install dependency jika folder node_modules belum ada
if [ ! -d "node_modules" ]; then
    echo "📦 Menginstall npm dependencies..."
    npm install
fi

# 5. Cek sintaks file server.js
echo "🔍 Memeriksa sintaks kode..."
node --check server.js && node --check public/app.js

# 6. Dapatkan port dari .env
PORT_ENV=$(grep -E '^PORT=' .env | cut -d '=' -f 2 | tr -d ' "\r')
PORT=${PORT_ENV:-8082}

# 7. Menjalankan aplikasi (via PM2 jika terinstall, atau langsung via Node.js)
if command -v pm2 >/dev/null 2>&1; then
    echo "🚀 Menjalankan aplikasi menggunakan PM2..."
    pm2 start ecosystem.config.js --update-env
    echo ""
    echo "========================================="
    echo "✅ DOORPRIZE Berhasil Dijalankan via PM2!"
    echo "🌐 Akses Lokal   : http://localhost:$PORT"
    echo "📊 Cek Status PM2: pm2 status"
    echo "📜 Cek Log PM2   : pm2 logs doorprize-satsiber"
    echo "========================================="
else
    echo "🚀 Menjalankan aplikasi dengan Node.js..."
    echo "========================================="
    echo "✅ DOORPRIZE Berjalan di http://localhost:$PORT"
    echo "Tekan Ctrl+C untuk menghentikan server."
    echo "========================================="
    exec node server.js
fi
