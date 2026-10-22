@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Kutubxonalar o'rnatilmoqda...
  call npm install --no-audit --no-fund
)
echo Server ishga tushmoqda: http://localhost:5180
call npm run dev -- --open
pause
