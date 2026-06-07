@echo off
cd %~dp0\..\..
echo =======================================================
echo     Compilador Automatico Bodego
echo =======================================================
echo.
echo Compilando Frontend (React Vite)...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo Error compilando el frontend.
    pause
    exit /b %errorlevel%
)
cd ..

echo Copiando dist a backend...
if exist "backend\dist" rmdir /s /q "backend\dist"
xcopy "frontend\dist" "backend\dist" /e /i /h /y

echo Instalando requerimientos de backend...
cd backend
if not exist "venv" (
    echo Creando entorno virtual...
    python -m venv venv
)
call .\venv\Scripts\activate
call pip install -r requirements.txt
call pip install pyinstaller pandas openpyxl pillow pywebview

set ICON_PARAM=
if exist "app.ico" (
    set ICON_PARAM=--icon="app.ico"
)

echo Compilando Backend con PyInstaller...
pyinstaller --name "Bodego" --windowed --onefile %ICON_PARAM% --add-data "dist;dist" --hidden-import="routers" --hidden-import="models" --hidden-import="schemas" --hidden-import="database" --hidden-import="auth" --hidden-import="passlib.handlers.bcrypt" --hidden-import="bcrypt" --hidden-import="uvicorn" --hidden-import="webview" main.py

echo.
echo Volviendo a la carpeta principal...
cd ..

echo.
echo =======================================================
echo     Creando el Instalador Setup (Inno Setup)...
echo =======================================================
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "scripts\windows\installer.iss"

echo.
echo =======================================================
echo Proceso terminado.
echo El Instalador final esta disponible en la carpeta: Output\Instalador_Bodego.exe
echo =======================================================
pause
