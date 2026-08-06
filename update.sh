#!/bin/sh
# DOORPRIZE - Auto-Update & Redeploy Script (update.sh)
# Menarik kode terbaru dari Git, install dependency bila berubah, validasi
# sintaks, lalu restart server (via PM2 bila tersedia).
#
#   Update manual : sh update.sh          (atau: npm run update)
#   Paksa deploy  : sh update.sh --force  (redeploy walau tak ada commit baru)
#
#   Deploy OTOMATIS (cron) — contoh cek tiap 5 menit, tulis log ke data/update.log:
#     */5 * * * * cd /home/doorprize && sh update.sh >> data/update.log 2>&1

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

FORCE=0
[ "$1" = "--force" ] && FORCE=1

echo "========================================="
echo "  DOORPRIZE - Auto Update (update.sh)"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 0. Prasyarat
command -v node >/dev/null 2>&1 || { echo "❌ Node.js belum terinstall."; exit 1; }
command -v git  >/dev/null 2>&1 || { echo "❌ git belum terinstall."; exit 1; }
[ -d .git ] || { echo "❌ Bukan git repository (jalankan 'git clone <url>' dulu)."; exit 1; }

# 1. Cek update dari remote
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "🌿 Branch: $BRANCH"
echo "⬇️  Mengecek update dari origin/$BRANCH..."
git fetch --quiet origin "$BRANCH"

OLD_HEAD="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/$BRANCH")"

if [ "$OLD_HEAD" = "$REMOTE" ] && [ "$FORCE" -eq 0 ]; then
    echo "✅ Sudah versi terbaru ($(git rev-parse --short HEAD)). Tidak ada yang perlu di-deploy."
    exit 0
fi

# 2. Terapkan update (fast-forward saja — aman untuk server produksi)
if [ "$OLD_HEAD" != "$REMOTE" ]; then
    echo "🔄 Update ditemukan: $(git rev-parse --short "$OLD_HEAD") -> $(git rev-parse --short "$REMOTE")"
    if ! git merge --ff-only "origin/$BRANCH"; then
        echo "❌ Tidak bisa fast-forward — ada perubahan lokal / branch divergen."
        echo "   Periksa 'git status'. Untuk memaksa ikut remote: git reset --hard origin/$BRANCH"
        exit 1
    fi
else
    echo "⚙️  Mode --force: redeploy versi $(git rev-parse --short HEAD) tanpa commit baru."
fi

# 3. Install dependency HANYA bila package.json berubah / node_modules belum ada
NEED_INSTALL=0
if [ ! -d node_modules ]; then
    NEED_INSTALL=1
elif ! git diff --quiet "$OLD_HEAD" HEAD -- package.json package-lock.json; then
    NEED_INSTALL=1
fi
if [ "$NEED_INSTALL" -eq 1 ]; then
    echo "📦 Dependency berubah / belum ada — menjalankan npm install..."
    npm install --no-audit --no-fund
else
    echo "📦 Dependency tidak berubah — lewati npm install."
fi

# 4. Validasi sintaks SEBELUM restart (jangan sampai men-deploy kode rusak)
echo "🔍 Memvalidasi sintaks..."
node --check server.js && node --check public/app.js

# 5. Restart / reload server
if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe doorprize-satsiber >/dev/null 2>&1; then
        echo "🚀 Reload aplikasi via PM2 (doorprize-satsiber)..."
        pm2 reload doorprize-satsiber --update-env
    else
        echo "🚀 Aplikasi belum ada di PM2 — start via ecosystem.config.js..."
        pm2 start ecosystem.config.js --update-env
    fi
    pm2 save >/dev/null 2>&1 || true
else
    echo "⚠️  PM2 tidak terpasang — restart manual diperlukan:"
    echo "    hentikan proses node lama, lalu jalankan: node server.js   (atau: sh slim.sh)"
fi

echo "========================================="
echo "✅ Deploy selesai — versi sekarang: $(git rev-parse --short HEAD)"
echo "========================================="
