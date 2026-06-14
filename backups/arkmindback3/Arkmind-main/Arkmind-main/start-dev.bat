@echo off
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Users\pucho\AppData\Roaming\npm"
cd /d "%~dp0"
set PORT=5173
set BASE_PATH=/
echo.
echo Iniciando UX Arquitecto en http://localhost:5173
echo (Cierra esta ventana con Ctrl+C para detener el servidor)
echo.
pnpm --filter @workspace/ux-arquitecto run dev
pause
