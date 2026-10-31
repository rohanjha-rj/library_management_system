@echo off
echo Library Management System - Starting...
echo.

REM Kill any running instances
taskkill /F /IM electron.exe /T 2>nul

REM Start the application
cd /d "%~dp0"
.\node_modules\electron\dist\electron.exe .

if %errorlevel% neq 0 (
    echo.
    echo Application failed to start. Trying with --no-sandbox...
    .\node_modules\electron\dist\electron.exe . --no-sandbox --disable-gpu
)
