@echo off
echo ========================================
echo Egypt Air Sentiment Analysis - Setup
echo ========================================
echo.
echo This will install all dependencies...
echo.
cd /d E:\
echo Current directory: %CD%
echo.
echo Installing npm packages...
npm install
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================
    echo Installation successful!
    echo ========================================
    echo.
    echo Now starting the development server...
    echo.
    npm run dev
) else (
    echo ========================================
    echo Installation failed!
    echo ========================================
    echo Please check the error messages above.
    pause
)
