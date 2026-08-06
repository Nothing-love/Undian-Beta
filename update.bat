@echo off
title DOORPRIZE Auto Update
cd /d "%~dp0"

echo =========================================
echo   DOORPRIZE - Auto Update (update.bat)
echo =========================================

where node >nul 2>nul
if %errorlevel% neq 0 ( echo [ERROR] Node.js belum terpasang atau tidak ada di PATH. & pause & exit /b 1 )
where git >nul 2>nul
if %errorlevel% neq 0 ( echo [ERROR] git belum terpasang atau tidak ada di PATH. & pause & exit /b 1 )
if not exist ".git" ( echo [ERROR] Folder ini bukan git repository. & pause & exit /b 1 )

echo [INFO] Mengambil update terbaru dari remote...
call git pull --ff-only
if %errorlevel% neq 0 ( echo [ERROR] Gagal git pull ^(ada perubahan lokal / branch divergen^). & pause & exit /b 1 )

if not exist "node_modules" (
    echo [INFO] Menginstal npm dependencies...
    call npm install
)

echo [INFO] Memvalidasi sintaks kode...
call node --check server.js
if %errorlevel% neq 0 ( echo [ERROR] Ada kesalahan sintaks pada server.js & pause & exit /b 1 )
call node --check public/app.js
if %errorlevel% neq 0 ( echo [ERROR] Ada kesalahan sintaks pada public/app.js & pause & exit /b 1 )

where pm2 >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Restart aplikasi via PM2...
    call pm2 restart doorprize-satsiber --update-env || call pm2 start ecosystem.config.js --update-env
    call pm2 save
) else (
    echo [WARN] PM2 tidak terpasang. Jalankan ulang manual: node server.js  ^(atau slim.bat^)
)

echo =========================================
echo [OK] Deploy selesai.
echo =========================================
pause
