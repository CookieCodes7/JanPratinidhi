@echo off
cd /d "%~dp0"
echo.
echo JanPratinidhi - Local Development
node --version >nul 2>&1 || (echo Node.js is not installed. Install Node.js LTS first. & pause & exit /b 1)
npm --version >nul 2>&1 || (echo npm is not available. Reinstall Node.js LTS. & pause & exit /b 1)
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (echo npm install failed. & pause & exit /b 1)
)
echo Starting JanPratinidhi at http://localhost:5173
call npm run dev
