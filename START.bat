@echo off
REM ============================================
REM  EGYPTAIR FEEDBACK SYSTEM - ONE-CLICK START
REM  Double-click this file to start everything
REM ============================================

title Starting EgyptAir System...
color 0B

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: Run this from the project root directory!
    pause
    exit /b 1
)

REM Clean up any zombie processes
echo [CLEANUP] Stopping old processes...
taskkill /F /IM python.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start the servers using the main script
echo [START] Launching servers...
call START_SERVERS.bat

exit
