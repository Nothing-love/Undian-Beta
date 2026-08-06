# DOORPRIZE - Auto-Update & Redeploy (Windows PowerShell)
# Pakai:  powershell -ExecutionPolicy Bypass -File .\update.ps1  [-Force]

param([switch]$Force)

$ErrorActionPreference = "Stop"
# Jangan biarkan stderr dari git/npm memicu error terminating di PowerShell 7+
$PSNativeCommandUseErrorActionPreference = $false
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DOORPRIZE - Auto Update (update.ps1)" -ForegroundColor Cyan
Write-Host ("  " + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "❌ Node.js belum terpasang." -ForegroundColor Red; exit 1 }
if (-not (Get-Command git  -ErrorAction SilentlyContinue)) { Write-Host "❌ git belum terpasang." -ForegroundColor Red; exit 1 }
if (-not (Test-Path ".git")) { Write-Host "❌ Folder ini bukan git repository." -ForegroundColor Red; exit 1 }

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "🌿 Branch: $branch"
Write-Host "⬇️  Mengecek update dari origin/$branch..." -ForegroundColor Yellow
git fetch --quiet origin $branch

$oldHead = (git rev-parse HEAD).Trim()
$remote  = (git rev-parse "origin/$branch").Trim()

if ($oldHead -eq $remote -and -not $Force) {
    Write-Host ("✅ Sudah versi terbaru (" + $oldHead.Substring(0, 7) + "). Tidak ada deploy.") -ForegroundColor Green
    exit 0
}

if ($oldHead -ne $remote) {
    Write-Host "🔄 Update ditemukan — fast-forward..." -ForegroundColor Yellow
    git merge --ff-only "origin/$branch"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Tidak bisa fast-forward (ada perubahan lokal pada file terlacak)." -ForegroundColor Red
        Write-Host "   Jalankan 'git status'. Jika karena data/*_state.json dari clone lama:" -ForegroundColor Red
        Write-Host "     git rm -r --cached data/*_state.json   lalu jalankan update.ps1 lagi" -ForegroundColor Red
        Write-Host "   JANGAN 'git reset --hard' di produksi — menghapus data undian & gambar." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚙️  Mode -Force: redeploy tanpa commit baru." -ForegroundColor Yellow
}

$needInstall = $true
if (Test-Path "node_modules") {
    git diff --quiet $oldHead HEAD -- package.json package-lock.json
    if ($LASTEXITCODE -eq 0) { $needInstall = $false }
}
if ($needInstall) {
    Write-Host "📦 Dependency berubah / belum ada — npm install..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
} else {
    Write-Host "📦 Dependency tidak berubah — lewati npm install."
}

Write-Host "🔍 Memvalidasi sintaks..." -ForegroundColor Yellow
node --check server.js;      if ($LASTEXITCODE -ne 0) { exit 1 }
node --check public/app.js;  if ($LASTEXITCODE -ne 0) { exit 1 }

if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    pm2 describe doorprize-satsiber *> $null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🚀 Reload aplikasi via PM2 (doorprize-satsiber)..." -ForegroundColor Green
        pm2 reload doorprize-satsiber --update-env
    } else {
        Write-Host "🚀 Start via PM2 (ecosystem.config.js)..." -ForegroundColor Green
        pm2 start ecosystem.config.js --update-env
    }
    pm2 save *> $null
} else {
    Write-Host "⚠️  PM2 tidak terpasang. Restart manual: node server.js (atau serve.ps1)." -ForegroundColor Yellow
}

Write-Host "=========================================" -ForegroundColor Green
Write-Host ("✅ Deploy selesai — versi: " + (git rev-parse --short HEAD)) -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
