@echo off
setlocal EnableDelayedExpansion
echo =======================================================
echo     Actualizador TOTAL Bodego POS (Git + Hetzner)
echo =======================================================
echo.
echo Este script hara TODO por ti: 
echo 1. Guardara tus cambios locales en GitHub.
echo 2. Se conectara a tu servidor en la nube.
echo 3. Actualizara la pagina web en vivo.
echo.

set /p commit_msg="Escribe un mensaje corto de lo que cambiaste (ej: arreglo de botones): "
if "!commit_msg!"=="" set commit_msg=Actualizacion automatica

echo.
echo [1/3] Preparando archivos para GitHub...
git add .
git commit -m "!commit_msg!"

echo.
echo [2/3] Subiendo codigo a GitHub...
git push origin master

echo.
echo [3/3] Conectando al servidor Hetzner (178.156.196.20)...
echo Por favor, ingresa la contrasena de tu servidor:
echo (Recuerda que al escribirla no se veran los asteriscos)
echo.

ssh -t root@178.156.196.20 "cd /var/www/app-ventas && bash scripts/server/deploy.sh"

echo.
echo =======================================================
echo Proceso terminado. Si viste el mensaje verde, 
echo tu web bodego.simplegoapp.de ha sido actualizada con exito.
echo =======================================================
pause
