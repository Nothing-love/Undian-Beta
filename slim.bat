@echo off
title DOORPRIZE Launcher
cd /d "%~dp0"

echo =========================================
echo   DOORPRIZE - Windows Launcher (slim.bat)
echo =========================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js belum terpasang atau tidak ada di PATH.
    pause
    exit /b 1
)

if not exist ".env" (
    echo [INFO] Membuat file .env otomatis...
    (
        echo PORT=8082
        echo ADMIN_USERNAME=admin
        echo ADMIN_PASSWORD=admin2026
        echo SESSION_SECRET=secret-doorprize-win-8082
        echo TUNNEL_PROVIDER=none
    ) > .env
    echo [OK] File .env berhasil dibuat.
)

if not exist "data\sessions" mkdir "data\sessions"
if not exist "public\uploads" mkdir "public\uploads"

if not exist "node_modules" (
    echo [INFO] Menginstal npm dependencies...
    call npm install
)

echo [INFO] Memeriksa sintaks kode...
call node --check server.js
if %errorlevel% neq 0 (
    echo [ERROR] Ada kesalahan sintaks pada server.js
    pause
    exit /b 1
)

echo.
echo =========================================
echo [OK] DOORPRIZE Berjalan di http://localhost:8082
echo Tekan Ctrl+C untuk menghentikan server.
echo =========================================
echo.

node server.js
pause
