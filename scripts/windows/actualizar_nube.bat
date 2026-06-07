@echo off
echo =======================================================
echo     Actualizador Remoto Bodego POS (Servidor Hetzner)
echo =======================================================
echo.
echo Este script se conectara a tu servidor en la nube
echo y ejecutara la ultima actualizacion del sistema.
echo.
echo Por favor, ingresa la contrasena de tu servidor Hetzner:
echo (Recuerda que al escribirla no se veran los asteriscos)
echo.

ssh -t root@178.156.196.20 "cd /var/www/app-ventas && bash scripts/server/deploy.sh"

echo.
echo =======================================================
echo Proceso terminado. Revisa los mensajes de arriba.
echo Si ves el mensaje verde de EXITO, tu pagina web
echo bodego.simplegoapp.de ya esta actualizada.
echo =======================================================
pause
