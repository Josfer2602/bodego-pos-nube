---
description: Inicia el entorno de desarrollo local (Backend y Frontend)
---

// turbo-all

## Pasos para ejecutar la aplicación localmente

1. Iniciar el Backend (Python FastAPI):
   Ejecuta esto en una terminal dedicada al backend.
```powershell
cd c:\Users\josen\respaldo_app_ventas_20260309_234304\backend; .\venv\Scripts\activate; uvicorn main:app --reload
```

2. Iniciar el Frontend (React Vite):
   Ejecuta esto en una terminal dedicada al frontend.
```powershell
cd c:\Users\josen\respaldo_app_ventas_20260309_234304\frontend; npm run dev
```

3. Abrir la aplicación en el navegador:
   Por defecto, Vite abre en el puerto 5173.
```powershell
Start-Process "http://localhost:5173"
```
