# EgyptAir Feedback Analysis System - Background Service Starter
# Servers run as hidden background processes that survive terminal closure

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = "$ProjectDir\backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EgyptAir Feedback Analysis System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes on our ports
Write-Host "[CLEANUP] Stopping any existing servers..." -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Start Backend as hidden background process
Write-Host "[START] Starting Backend Server (port 8001)..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$BackendDir`" && python -m uvicorn main:app --host 0.0.0.0 --port 8001" -WindowStyle Hidden

Start-Sleep -Seconds 4

# Start Frontend as hidden background process
Write-Host "[START] Starting Frontend Server..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$ProjectDir`" && npm run dev" -WindowStyle Hidden

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:8001" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login: admin / admin123" -ForegroundColor White
Write-Host ""
Write-Host "  Servers running in BACKGROUND!" -ForegroundColor Green
Write-Host "  You can CLOSE this window safely!" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"

Write-Host "Press any key to close..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
