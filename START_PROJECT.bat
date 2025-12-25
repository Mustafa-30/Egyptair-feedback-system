@echo off
title EgyptAir Feedback System - Startup
color 0A

echo ========================================
echo EgyptAir Feedback Analysis System
echo Starting Backend and Frontend Servers
echo ========================================
echo.

REM Kill any existing Python/Node processes on these ports
echo Stopping any existing servers...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak > nul

REM Start Backend Server in new window
echo [1/2] Starting Backend Server (Port 8000)...
cd /d "%~dp0backend"
start "EgyptAir Backend [DO NOT CLOSE]" cmd /k "python -m uvicorn main:app --reload --port 8000 --host 127.0.0.1"
cd /d "%~dp0"
timeout /t 4 /nobreak > nul

REM Start Frontend Server in new window
echo [2/2] Starting Frontend Server (Port 3000)...
start "EgyptAir Frontend [DO NOT CLOSE]" cmd /k "npm run dev"
timeout /t 3 /nobreak > nul

echo.
echo ========================================
echo SERVERS STARTED SUCCESSFULLY!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:3000
echo.
echo Login Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo IMPORTANT:
echo - Two windows opened (Backend and Frontend)
echo - DO NOT CLOSE those windows!
echo - You can close this window now
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak > nul
start http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul
