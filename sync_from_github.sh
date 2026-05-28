#!/bin/bash
# Script para descargar cambios desde la laptop (rama master en GitHub) y aplicarlos al servidor

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}
success() {
    echo -e "${GREEN}✓ $1${NC}"
}
error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Asegurarnos que estamos en el directorio correcto
cd /var/www/app-ventas

log "Descargando actualizaciones desde GitHub (rama master)..."

# 2. Obtener la información más reciente de GitHub
git fetch origin master

# 3. Combinar los cambios forzando la aceptación de la versión de la laptop (theirs)
log "Combinando cambios..."
# Nota: usamos --no-edit para evitar que abra un editor de texto pidiendo un mensaje
if git merge origin/master -X theirs --allow-unrelated-histories --no-edit; then
    success "Cambios combinados correctamente."
else
    error "Hubo un problema al combinar los cambios."
    exit 1
fi

# 4. Ejecutar el script de despliegue
log "Iniciando proceso de reconstrucción (Deploy)..."
if [ -x "./deploy.sh" ]; then
    ./deploy.sh
else
    error "No se encontró el script deploy.sh o no es ejecutable."
    exit 1
fi

echo
echo "=================================================="
success "¡Sincronización Completada!"
echo "Revisa tu página web y recarga con Ctrl + Shift + R."
echo "=================================================="
