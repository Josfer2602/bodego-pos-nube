#!/bin/bash
# Script para iniciar desarrollo local
# Ejecutar desde la raíz del proyecto

echo "🚀 Iniciando desarrollo local de POS ERP..."

# Función para verificar si un puerto está en uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "❌ Puerto $1 ya está en uso"
        return 1
    else
        echo "✅ Puerto $1 disponible"
        return 0
    fi
}

# Verificar puertos
echo "Verificando puertos..."
check_port 8001 || exit 1
check_port 5173 || exit 1

# Iniciar backend en background
echo "📡 Iniciando backend..."
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001 &
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