#!/bin/bash

# Script para automatizar la subida de cambios a GitHub
# Uso: ./git_sync.sh "mensaje del commit"

# Verificar si se proporcionó un mensaje de commit
if [ -z "$1" ]; then
    echo "⚠️  Por favor, proporciona un mensaje para el commit."
    echo "   Uso: ./git_sync.sh \"mi mensaje de commit\""
    exit 1
fi

COMMIT_MSG=$1

echo "🔍 Verificando estado de Git..."
git status

echo "➕ Agregando todos los cambios..."
git add .

echo "💾 Creando commit: \"$COMMIT_MSG\"..."
git commit -m "$COMMIT_MSG"

echo "🚀 Subiendo a GitHub (rama master)..."
git push origin master

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ ¡CAMBIOS SUBIDOS EXITOSAMENTE A GITHUB!"
    echo "=================================================="
else
    echo ""
    echo "=================================================="
    echo "❌ ERROR AL SUBIR CAMBIOS"
    echo "   Verifica tu conexión y permisos de GitHub"
    echo "=================================================="
    exit 1
fi
