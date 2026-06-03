# Etapa 1: Construir el Frontend (React)
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Etapa 2: Configurar el Backend (FastAPI) y Servir
FROM python:3.10-slim
WORKDIR /app

# Instalar dependencias de Python
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copiar código del backend
COPY backend/ ./backend/

# Copiar frontend compilado a la carpeta que espera FastAPI
COPY --from=frontend-builder /app/frontend/dist ./backend/dist

# Variables de Entorno predeterminadas (Ideales para Demo)
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DEMO_MODE=True
ENV ALLOWED_ORIGINS="http://localhost:8000"

WORKDIR /app/backend

# Exponer el puerto
EXPOSE 8000

# Comando para iniciar (Ignora webview porque el archivo no se ejecuta como __main__)
CMD ["sh", "-c", "uvicorn main:app --host $HOST --port $PORT --workers 2"]
