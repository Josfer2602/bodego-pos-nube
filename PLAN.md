# Plan de Ejecución: Sistema de Ventas (POS)

## Arquitectura y Tecnologías
- **Frontend**: React + Vite + Tailwind CSS.
- **Backend**: Python con FastAPI.
- **Base de Datos**: SQLite (usando SQLAlchemy).

## Fases del Proyecto

### Fase 1: Planificación inicial (Completada)
- [x] Crear el plan de ejecución (`PLAN.md`).
- [x] Estructurar directorios básicos (`/frontend` y `/backend`).

### Fase 2: Configuración del entorno Backend (Completada)
- [x] Configurar entorno virtual de Python.
- [x] Instalar dependencias (`fastapi`, `uvicorn`, `sqlalchemy`, `pydantic`).
- [x] Configurar esqueleto básico (`main.py`, `database.py`).

### Fase 3: Modelos y Base de Datos (Completada)
- [x] Crear el modelo `Product` (id, name, price, stock).
- [x] Crear los modelos `Sale` y `SaleDetail`.
- [x] Configurar Pydantic schemas para validación de datos.

### Fase 4: Endpoints API en el Backend (Completada)
- [x] **Inventario (CRUD)**: `GET`, `POST`, `PUT`, `DELETE` en `/products`.
- [x] **Ventas**: `POST /sales` (Registrar venta y descontar stock), `GET /sales` (Historial).

### Fase 5: Inicialización del Frontend (Completada)
- [x] Configurar el proyecto con Vite y React.
- [x] Instalar Tailwind CSS y configurar sus rutas.
- [x] Configurar Axios para consumir el backend local.

### Fase 6: Desarrollo de Interfaces de Usuario (Completada)
- [x] **Inventario**: Pantalla para listar, agregar y editar productos.
- [x] **Punto de Venta (POS)**: Buscador de productos, ticket de venta y botón Confirmar Compra.
- [x] **Historial**: Tabla de ventas realizadas.

### Fase 7: Bodegas (Fechas de Vencimiento) (Completada)
- [x] **Backend**: Añadir `expiration_date` al modelo y schema de productos.
- [x] **Base de Datos**: Recrear SQLite para aplicar la migración del esquema.
- [x] **Frontend**: Añadir selección y visualización de fecha de vencimiento en el inventario. Alertas visuales para productos próximos a vencer.
