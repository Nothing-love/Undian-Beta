# DOORPRIZE launcher untuk Windows (PowerShell)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DOORPRIZE - Windows Launcher (PowerShell)" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js belum terpasang atau tidak ada di PATH." -ForegroundColor Red
    exit 1
}

$envFile = Join-Path $Root ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "⚙️ Membuat file .env otomatis..." -ForegroundColor Yellow
    $secret = [System.Guid]::NewGuid().ToString("N")
    $envContent = "PORT=8082`nADMIN_USERNAME=admin`nADMIN_PASSWORD=admin2026`nSESSION_SECRET=$secret`nTUNNEL_PROVIDER=none"
    [System.IO.File]::WriteAllText($envFile, $envContent)
    Write-Host "✅ File .env berhasil dibuat." -ForegroundColor Green
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root "data\sessions") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root "public\uploads") | Out-Null

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Host "📦 Menginstal npm dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "🔍 Memeriksa sintaks..." -ForegroundColor Yellow
node --check server.js

Write-Host "=========================================" -ForegroundColor Green
Write-Host "✅ DOORPRIZE berjalan di http://localhost:8082" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
node server.js
