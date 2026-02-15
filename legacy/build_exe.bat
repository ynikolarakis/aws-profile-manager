@echo off
python --version >nul 2>&1
if errorlevel 1 ( echo Python not found. & pause & exit /b 1 )
echo Installing...
python -m pip install boto3 pyinstaller --quiet
echo Building...
python -m PyInstaller --onefile --console --name "AWSProfileManager" ^
    --add-data "ui.html;." ^
    --add-data "logo.png;." ^
    --icon "icon.ico" ^
    --hidden-import boto3 --hidden-import botocore ^
    app.py
if exist "dist\AWSProfileManager.exe" ( echo SUCCESS: dist\AWSProfileManager.exe ) else ( echo Build failed. )
pause
