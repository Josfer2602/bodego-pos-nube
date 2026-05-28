#!/bin/bash
# Script para iniciar desarrollo local
# Ejecutar desde la raíz del proyecto
# Este script está escrito en Bash, por lo que debe correr en un entorno
# compatible (Git Bash, WSL, Cygwin, etc.). Si lo lanzas desde PowerShell
# verás errores inesperados.

# comprobación rápida de shell
if [ -z "$BASH_VERSION" ]; then
    echo "⚠️  Este script necesita Bash (Git Bash, WSL, etc.)."
    echo "   Abre Git Bash o WSL, sitúate en la carpeta del proyecto y usa:"
    echo "       ./start_dev.sh"
    exit 1
fi

echo "🚀 Iniciando desarrollo local de POS ERP..."

# Función para verificar si un puerto está en uso
# (sólo se usa si lsof está presente; en Windows no suele estar)
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Puerto $1 ya está en uso"
        return 1
    else
        echo "✅ Puerto $1 disponible"
        return 0
    fi
}

# Verificar puertos (lsof no existe en Windows, así que solo lo intentamos si está disponible)
echo "Verificando puertos..."
if command -v lsof >/dev/null 2>&1; then
    check_port 8001 || exit 1
    check_port 5173 || exit 1
else
    echo "⚠️  lsof no disponible, omitiendo comprobación de puertos (Windows)."
fi

# Iniciar backend en background
# Cambiar a la carpeta backend es necesario para que los imports relativos funcionen
echo "📡 Iniciando backend..."
cd backend
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!
cd ..

# Esperar un poco para que el backend inicie
sleep 3

# Verificar que el backend está corriendo
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend iniciado correctamente (PID: $BACKEND_PID)"
else
    echo "❌ Error al iniciar backend"
    exit 1
fi

# Iniciar frontend
echo "🖥️  Iniciando frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Esperar un poco para que el frontend inicie
sleep 5

# Verificar que el frontend está corriendo
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend iniciado correctamente (PID: $FRONTEND_PID)"
else
    echo "❌ Error al iniciar frontend"
    # Matar backend si frontend falló
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=================================================="
echo "🎉 ¡APLICACIÓN INICIADA EXITOSAMENTE!"
echo "=================================================="
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://127.0.0.1:8001"
echo "📚 Documentación API: http://127.0.0.1:8001/docs"
echo ""
echo "👤 Credenciales por defecto:"
echo "   Usuario: superadmin"
echo "   Contraseña: admin123"
echo ""
echo "🛑 Para detener: presiona Ctrl+C"
echo "=================================================="

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servicios detenidos"
    exit 0
}

# Capturar señales de interrupción
trap cleanup SIGINT SIGTERM

# Mantener el script corriendo
wait