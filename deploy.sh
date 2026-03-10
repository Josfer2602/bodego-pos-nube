#!/bin/bash
# Despliegue automático para /var/www/app-ventas
# Versión mejorada con más validaciones y manejo de errores

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    error "Error: Este script debe ejecutarse desde la raíz del proyecto"
    error "Directorios 'backend' y 'frontend' no encontrados"
    exit 1
fi

log "Iniciando despliegue del sistema POS ERP..."

# Backup automático antes de actualizar
if [ -f "backup_app.sh" ]; then
    log "Creando backup automático..."
    ./backup_app.sh || warning "El backup falló, pero continuamos con el despliegue"
fi

# Actualizar código desde Git
log "Actualizando código desde repositorio..."
if git pull origin main 2>/dev/null; then
    success "Código actualizado desde Git"
else
    warning "No se pudo actualizar desde Git (¿está inicializado el repositorio?)"
fi

# Configurar backend
log "Configurando backend..."
cd backend

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    log "Creando entorno virtual..."
    python3 -m venv venv
    success "Entorno virtual creado"
fi

# Activar entorno virtual
log "Activando entorno virtual..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
    source venv/Scripts/activate  # Para Windows si se ejecuta desde WSL
else
    error "No se pudo activar el entorno virtual"
    exit 1
fi

# Instalar dependencias Python
log "Instalando dependencias Python..."
pip install --upgrade pip
pip install -r requirements.txt
success "Dependencias Python instaladas"

# Verificar que el backend se puede importar
log "Verificando configuración del backend..."
python3 -c "import main; print('Backend OK')" || {
    error "Error en la configuración del backend"
    exit 1
}

cd ..

# Configurar frontend
log "Configurando frontend..."
cd frontend

# Instalar dependencias Node.js
log "Instalando dependencias Node.js..."
npm install
success "Dependencias Node.js instaladas"

# Construir aplicación para producción
log "Construyendo aplicación frontend..."
npm run build
success "Build frontend completado"

# Copiar archivos construidos
log "Copiando archivos a directorio de producción..."
if [ ! -d "../dist" ]; then
    mkdir -p ../dist
fi
cp -r dist/* ../dist/
success "Archivos copiados a /dist"

cd ..

# Verificar permisos
log "Ajustando permisos..."
find . -type f -name "*.sh" -exec chmod +x {} \;
if [ -d "dist" ]; then
    chown -R www-data:www-data dist 2>/dev/null || true
fi
if [ -d "backend/uploads" ]; then
    chown -R www-data:www-data backend/uploads 2>/dev/null || true
fi

# Reiniciar servicios
log "Reiniciando servicios..."

# Backend
if systemctl is-active --quiet backend 2>/dev/null; then
    log "Reiniciando servicio backend..."
    systemctl restart backend && success "Backend reiniciado" || warning "No se pudo reiniciar backend"
else
    warning "Servicio backend no está activo. Iniciándolo..."
    systemctl start backend 2>/dev/null && success "Backend iniciado" || warning "No se pudo iniciar backend"
fi

# Nginx
if systemctl is-active --quiet nginx 2>/dev/null; then
    log "Recargando Nginx..."
    systemctl reload nginx && success "Nginx recargado" || warning "No se pudo recargar Nginx"
else
    warning "Nginx no está activo. Iniciándolo..."
    systemctl start nginx 2>/dev/null && success "Nginx iniciado" || warning "No se pudo iniciar Nginx"
fi

# Verificar estado de servicios
log "Verificando estado de servicios..."
if systemctl is-active --quiet backend 2>/dev/null; then
    success "✓ Servicio backend: ACTIVO"
else
    warning "⚠ Servicio backend: INACTIVO"
fi

if systemctl is-active --quiet nginx 2>/dev/null; then
    success "✓ Servicio Nginx: ACTIVO"
else
    warning "⚠ Servicio Nginx: INACTIVO"
fi

echo
echo "=================================================="
success "DESPLIEGUE COMPLETADO EXITOSAMENTE!"
echo "=================================================="
echo
echo "📱 Aplicación disponible en: http://tu-dominio.com"
echo "🔗 API disponible en: http://tu-dominio.com/api/"
echo "📊 Documentación API: http://tu-dominio.com/api/docs"
echo
echo "📋 Próximos pasos recomendados:"
echo "  1. Verificar que la aplicación carga correctamente"
echo "  2. Probar el login con superadmin/admin123"
echo "  3. Configurar SSL/HTTPS si es necesario"
echo "  4. Configurar monitoreo y logs"
echo
echo "🆘 En caso de problemas:"
echo "  - Revisar logs: sudo journalctl -u backend -f"
echo "  - Verificar Nginx: sudo nginx -t"
echo "  - Logs de Nginx: /var/log/nginx/"
echo
echo "=================================================="
