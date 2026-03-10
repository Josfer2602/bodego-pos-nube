#!/bin/bash
# Despliegue automático para /var/www/app-ventas
set -e

cd /var/www/app-ventas || exit 1

# Traer cambios desde GitHub
git pull origin main

# Activar entorno virtual (ajusta la ruta si tu venv está en otra ubicación)
if [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
elif [ -f "/var/www/app-ventas/venv/bin/activate" ]; then
  source /var/www/app-ventas/venv/bin/activate
fi

# Instalar dependencias Python
pip install -r backend/requirements.txt

# Reconstruir frontend
if [ -d "frontend" ]; then
  cd frontend
  npm install
  npm run build
  cp -r dist/* ../dist/
  cd -
fi

# Reiniciar servicios
systemctl restart backend || true
systemctl restart nginx || true

echo "Despliegue completado."
