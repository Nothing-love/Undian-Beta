# DOORPRIZE launcher untuk Windows
# Menjalankan server Express yang sama dengan autentikasi, API, dan upload.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js belum terpasang atau tidak ada di PATH." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $Root "node_modules"))) {
    Write-Host "Menginstal dependency..." -ForegroundColor Yellow
    npm install
}

$env:PORT = "8082"
Write-Host "DOORPRIZE berjalan di http://localhost:8082" -ForegroundColor Green
node server.js
