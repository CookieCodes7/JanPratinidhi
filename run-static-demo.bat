@echo off
cd /d "%~dp0\dist\public"
where python >nul 2>&1 || (echo Python is required for the static fallback. & pause & exit /b 1)
echo Starting prebuilt demo at http://localhost:4173
python -m http.server 4173 --bind 127.0.0.1
