#!/bin/bash
# Script de Backup para /var/www/app-ventas
# Este script crea un archivo comprimido (.tar.gz) para respaldo local.

BACKUP_DIR="/var/www/app-ventas/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="respaldo_app_ventas_${TIMESTAMP}.tar.gz"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "Iniciando respaldo en $BACKUP_DIR/$FILENAME..."

# Crear el archivo tar.gz excluyendo carpetas pesadas
tar -czf "$BACKUP_DIR/$FILENAME" \
    --exclude=".git" \
    --exclude="frontend/node_modules" \
    --exclude="venv" \
    --exclude="frontend/dist" \
    --exclude="dist" \
    --exclude="backups" \
    --exclude="__pycache__" \
    .

echo "------------------------------------------------"
echo "¡Respaldo completado con éxito!"
echo "Archivo: $BACKUP_DIR/$FILENAME"
echo "------------------------------------------------"
echo "Para descargar en Windows, usa FileZilla o WinSCP."
echo "Si usas FileZilla, recuerda presionar F5 para actualizar la lista de archivos."
