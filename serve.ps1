# DORPRIZE Local Server (PowerShell)
# Untuk akses jaringan penuh, jalankan sebagai Administrator:
#   powershell -ExecutionPolicy Bypass -File serve.ps1

$Port = 3000
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$listener = New-Object System.Net.HttpListener

# Try to listen on all interfaces first (requires Admin)
$allInterfaces = $false
try {
    $listener.Prefixes.Add("http://+:$Port/")
    $listener.Start()
    $allInterfaces = $true
} catch {
    # Fallback: listen on localhost only
    $listener = New-Object System.Net.HttpListener
    try {
        $listener.Prefixes.Add("http://localhost:$Port/")
        $listener.Start()
    } catch {
        Write-Host "Port $Port mungkin sudah digunakan." -ForegroundColor Red
        Write-Host "Tutup aplikasi yang menggunakan port tersebut, atau ganti port." -ForegroundColor Yellow
        exit 1
    }
}

# Get network addresses
$networkIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "           DORPRIZE - Server Running" -ForegroundColor White
Write-Host "  ======================================================" -ForegroundColor Cyan

if ($allInterfaces) {
    Write-Host "  Mode:     ALL INTERFACES (Admin)" -ForegroundColor Green
    Write-Host "  Local:    http://satsiberdorpize:$Port" -ForegroundColor Green
    Write-Host "  Local:    http://localhost:$Port" -ForegroundColor Green
    foreach ($ip in $networkIPs) {
        Write-Host "  Network:  http://${ip}:$Port" -ForegroundColor Green
    }
    Write-Host "  ------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  Remote Admin (HP/Laptop lain di WiFi sama):" -ForegroundColor Yellow
    Write-Host "  http://pausdorpize.adm1n" -ForegroundColor Yellow
    foreach ($ip in $networkIPs) {
        Write-Host "  http://${ip}:${Port}/?rc=true" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Mode:     LOCALHOST ONLY" -ForegroundColor Yellow
    Write-Host "  Local:    http://localhost:$Port" -ForegroundColor Green
    Write-Host "  " -ForegroundColor DarkGray
    Write-Host "  !! Untuk akses dari perangkat lain (HP)," -ForegroundColor Yellow
    Write-Host "     jalankan ulang sebagai Administrator !!" -ForegroundColor Yellow
}

Write-Host "  ------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Tekan Ctrl+C untuk menghentikan server" -ForegroundColor DarkGray
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

$MimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.ico'  = 'image/x-icon'
    '.xlsx' = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    '.woff' = 'font/woff'
    '.woff2'= 'font/woff2'
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq '/') { $urlPath = '/index.html' }

        # Handle CORS
        $response.AddHeader("Access-Control-Allow-Origin", "*")
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($request.HttpMethod -eq 'OPTIONS') {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        if ($urlPath -eq '/api/admin') {
            $stateFile = Join-Path $Root "admin_state.json"
            $response.ContentType = 'application/json'
            
            if ($request.HttpMethod -eq 'GET') {
                if (Test-Path $stateFile) {
                    $bytes = [System.IO.File]::ReadAllBytes($stateFile)
                    $response.StatusCode = 200
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } else {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("[]")
                    $response.StatusCode = 200
                    $response.ContentLength64 = $msg.Length
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
                Write-Host "  200 GET /api/admin" -ForegroundColor Blue
            } 
            elseif ($request.HttpMethod -eq 'POST') {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                    
                    [System.IO.File]::WriteAllText($stateFile, $body, [System.Text.Encoding]::UTF8)
                    
                    $msg = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                    $response.StatusCode = 200
                    $response.ContentLength64 = $msg.Length
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                    Write-Host "  200 POST /api/admin" -ForegroundColor Magenta
                } catch {
                    $response.StatusCode = 500
                    Write-Host "  500 POST /api/admin Error" -ForegroundColor Red
                }
            }
        }
        elseif ($urlPath -eq '/api/peserta') {
            $stateFile = Join-Path $Root "peserta_state.json"
            $response.ContentType = 'application/json'
            
            if ($request.HttpMethod -eq 'GET') {
                if (Test-Path $stateFile) {
                    $bytes = [System.IO.File]::ReadAllBytes($stateFile)
                    $response.StatusCode = 200
                    $response.ContentLength64 = $bytes.Length
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                } else {
                    $msg = [System.Text.Encoding]::UTF8.GetBytes("[]")
                    $response.StatusCode = 200
                    $response.ContentLength64 = $msg.Length
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
                Write-Host "  200 GET /api/peserta" -ForegroundColor Blue
            } 
            elseif ($request.HttpMethod -eq 'POST') {
                try {
                    $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                    $body = $reader.ReadToEnd()
                    $reader.Close()
                    
                    [System.IO.File]::WriteAllText($stateFile, $body, [System.Text.Encoding]::UTF8)
                    
                    $msg = [System.Text.Encoding]::UTF8.GetBytes('{"success":true}')
                    $response.StatusCode = 200
                    $response.ContentLength64 = $msg.Length
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                    Write-Host "  200 POST /api/peserta" -ForegroundColor Magenta
                } catch {
                    $response.StatusCode = 500
                    Write-Host "  500 POST /api/peserta Error" -ForegroundColor Red
                }
            }
        }
        else {
            # Serve static files
            $filePath = Join-Path $Root ($urlPath -replace '/', '\')

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { 'application/octet-stream' }
                
                $response.ContentType = $contentType
                $response.StatusCode = 200
                
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                
                Write-Host "  200 $urlPath" -ForegroundColor DarkGray
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
                
                Write-Host "  404 $urlPath" -ForegroundColor DarkYellow
            }
        }

        $response.Close()
    }
} finally {
    $listener.Stop()
    Write-Host "`nServer dihentikan." -ForegroundColor Yellow
}
