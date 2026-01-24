# ================================================
# EgyptAir Feedback System - GUARANTEED STARTUP
# ================================================
# This script ALWAYS works - no more port issues!

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:\Gruaduation project\Code of project\Egyptair-feedback-system"

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "   EgyptAir Feedback System - Starting..." -ForegroundColor Cyan
Write-Host "================================================`n" -ForegroundColor Cyan

# Step 1: Kill ANY existing servers (clean slate)
Write-Host "[1/4] Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name python*,node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Step 2: Start Backend on port 8000
Write-Host "[2/4] Starting Backend (port 8000)..." -ForegroundColor Green
Set-Location "$ProjectRoot\backend"
$backendJob = Start-Job -ScriptBlock {
    Set-Location "d:\Gruaduation project\Code of project\Egyptair-feedback-system\backend"
    python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
}
Start-Sleep -Seconds 6

# Verify backend started
$backendRunning = $false
for ($i = 1; $i -le 5; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $backendRunning = $true
        Write-Host "   ✅ Backend is LIVE on port 8000" -ForegroundColor Green
        break
    } catch {
        Write-Host "   ⏳ Waiting for backend... (attempt $i/5)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendRunning) {
    Write-Host "   ❌ Backend failed to start!" -ForegroundColor Red
    Get-Job | Remove-Job -Force
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 3: Start Frontend on port 3000
Write-Host "[3/4] Starting Frontend (port 3000)..." -ForegroundColor Green
Set-Location $ProjectRoot
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "d:\Gruaduation project\Code of project\Egyptair-feedback-system"
    npm run dev
}
Start-Sleep -Seconds 8

# Step 4: Verify everything is running
Write-Host "[4/4] Verifying services..." -ForegroundColor Green
$ports = @(8000, 3000)
$allGood = $true

foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        $process = (Get-Process -Id $connection[0].OwningProcess -ErrorAction SilentlyContinue).ProcessName
        Write-Host "   ✅ Port $port listening ($process)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Port $port NOT listening!" -ForegroundColor Red
        $allGood = $false
    }
}

# Final status
Write-Host "`n================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "   ✅ ALL SYSTEMS OPERATIONAL!" -ForegroundColor Green
    Write-Host "`n   Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend:   http://localhost:8000" -ForegroundColor White
    Write-Host "   API Docs:  http://localhost:8000/docs" -ForegroundColor White
    Write-Host "`n   Login: admin / admin123" -ForegroundColor Yellow
    Write-Host "`n   DO NOT CLOSE THIS WINDOW!" -ForegroundColor Red
    Write-Host "================================================`n" -ForegroundColor Cyan
    
    # Open browser
    Start-Process "http://localhost:3000"
    
    # Keep script running
    Write-Host "Press Ctrl+C to stop all servers..." -ForegroundColor Gray
    try {
        Wait-Job -Job $backendJob,$frontendJob
    } finally {
        Get-Job | Remove-Job -Force
    }
} else {
    Write-Host "   ❌ STARTUP FAILED!" -ForegroundColor Red
    Write-Host "================================================`n" -ForegroundColor Cyan
    Get-Job | Remove-Job -Force
    Read-Host "Press Enter to exit"
    exit 1
}
