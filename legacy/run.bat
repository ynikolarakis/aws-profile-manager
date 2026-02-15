@echo off
title AWS Profile Manager v7
python --version >nul 2>&1
if errorlevel 1 ( echo Python not found. Install from python.org & pause & exit /b 1 )
echo Installing boto3...
python -m pip install boto3 --quiet
echo.
echo Starting AWS Profile Manager...
echo (Browser will open automatically)
echo.
python "%~dp0app.py"
pause
