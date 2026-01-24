@echo off
title EgyptAir Feedback System
cd /d "d:\Gruaduation project\Code of project\Egyptair-feedback-system"

echo ========================================
echo   EgyptAir Feedback Analysis System
echo ========================================
echo.

:: Stop existing servers
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [1/2] Starting Backend Server...
cd backend
start /min cmd /c "python -m uvicorn main:app --host 0.0.0.0 --port 8001"
cd ..
timeout /t 4 /nobreak >nul

echo [2/2] Starting Frontend Server...
start /min cmd /c "npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Servers are running!
echo ========================================
echo.
echo   Backend:  http://localhost:8001
echo   Frontend: http://localhost:5173
echo.
echo   Login: admin / admin123
echo.
echo   You can MINIMIZE this window.
echo   DO NOT CLOSE it or servers will stop.
echo.
echo   Opening browser...
start http://localhost:5173

echo.
echo Press Ctrl+C to stop servers.
pause >nul
