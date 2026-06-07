#!/bin/bash
# Script de configuración inicial para el servidor
# Ejecutar como root o con sudo

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    error "Este script debe ejecutarse como root (sudo)"
    exit 1
fi

log "Iniciando configuración inicial del servidor..."

# Actualizar sistema
log "Actualizando sistema..."
apt update && apt upgrade -y
success "Sistema actualizado"

# Instalar dependencias básicas
log "Instalando dependencias básicas..."
apt install -y curl wget git unzip software-properties-common
success "Dependencias básicas instaladas"

# Instalar Python 3.9+ si no está disponible
if ! command -v python3.9 &> /dev/null && ! command -v python3.10 &> /dev/null && ! command -v python3.11 &> /dev/null; then
    log "Instalando Python 3.11..."
    add-apt-repository ppa:deadsnakes/ppa -y
    apt update
    apt install -y python3.11 python3.11-venv python3.11-dev
    success "Python 3.11 instalado"
fi

# Instalar Node.js 18+ si no está disponible
if ! command -v node &> /dev/null || [ "$(node --version | cut -d'.' -f1 | cut -d'v' -f2)" -lt 18 ]; then
    log "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    success "Node.js 18 instalado"
fi

# Instalar Nginx
log "Instalando Nginx..."
apt install -y nginx
success "Nginx instalado"

# Instalar PostgreSQL (opcional, por si se migra de SQLite)
read -p "¿Deseas instalar PostgreSQL? (y/N): " install_postgres
if [[ $install_postgres =~ ^[Yy]$ ]]; then
    log "Instalando PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    success "PostgreSQL instalado y habilitado"
fi

# Crear directorio de la aplicación
log "Creando directorio de la aplicación..."
mkdir -p /var/www/app-ventas
chown -R www-data:www-data /var/www/app-ventas
success "Directorio creado: /var/www/app-ventas"

# Configurar firewall básico
log "Configurando firewall..."
apt install -y ufw
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
success "Firewall configurado"

# Instalar certbot para SSL (opcional)
read -p "¿Deseas instalar Certbot para SSL? (y/N): " install_certbot
if [[ $install_certbot =~ ^[Yy]$ ]]; then
    log "Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
    success "Certbot instalado"
fi

echo
echo "=================================================="
success "CONFIGURACIÓN INICIAL COMPLETADA!"
echo "=================================================="
echo
echo "📋 Próximos pasos:"
echo "  1. Clonar tu repositorio en /var/www/app-ventas"
echo "  2. Ejecutar el script de despliegue: bash scripts/server/deploy.sh"
echo "  3. Configurar Nginx: cp scripts/server/nginx.conf.example /etc/nginx/sites-available/app-ventas"
echo "  4. Configurar el servicio: cp scripts/server/backend.service.example /etc/systemd/system/backend.service"
echo "  5. Obtener certificado SSL si es necesario: certbot --nginx"
echo
echo "🆘 Comandos útiles:"
echo "  - Ver logs del backend: journalctl -u backend -f"
echo "  - Ver logs de Nginx: tail -f /var/log/nginx/error.log"
echo "  - Reiniciar servicios: systemctl restart backend nginx"
echo
echo "=================================================="