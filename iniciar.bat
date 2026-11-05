@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Instala Node.js desde https://nodejs.org y vuelve a abrir esto. & pause & exit /b)
node server.js
pause
