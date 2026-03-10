# Sistema de Ventas (POS)

Sistema completo Full-Stack con FastAPI en el Backend y React+Vite en el Frontend.

## Requisitos
- Python 3.9+ 
- Node.js 18+

## Instrucciones para ejecutar el proyecto

### 1. Iniciar el Backend (FastAPI)
Abre una terminal y ejecuta los siguientes comandos:
```bash
cd backend
# Activar entorno virtual (en Windows)
.\venv\Scripts\activate
# Iniciar servidor
uvicorn main:app --reload
```
La API estará disponible en `http://localhost:8000`

### 2. Iniciar el Frontend (React + Vite)
Abre otra terminal y ejecuta:
```bash
cd frontend
# Iniciar servidor de desarrollo
npm run dev
```
La aplicación web estará disponible típicamente en `http://localhost:5173`

## Características 
- **Inventario**: CRUD de productos completo (Nombre, Precio, Stock).
- **Punto de Venta**: Carrito integrado que descuenta el stock directamente de la base de datos al confirmar la compra.
- **Historial**: Tablero con las ventas procesadas y sus detalles (ítems vendidos, fecha y total).
