# Sistema de Ventas (POS) - ERP Completo

Sistema completo Full-Stack con FastAPI en el Backend y React+Vite en el Frontend.
**Completamente responsive** para desktop, tablet y mobile.

## 🚀 Características Principales
- **📱 Mobile Responsive**: Optimizado para todos los dispositivos
- **🏪 Multi-Sucursal**: Gestión de múltiples proyectos/tiendas
- **👥 Control de Usuarios**: Roles (Superadmin, Admin, Cliente)
- **📊 Dashboard Analytics**: Métricas y reportes en tiempo real
- **🛒 POS Avanzado**: Carrito inteligente con promociones automáticas
- **📦 Inventario Completo**: Control de stock, códigos de barras, fechas de vencimiento
- **💰 Historial de Ventas**: Seguimiento completo de transacciones
- **🎨 Personalización**: Logos, colores temáticos por sucursal
- **🔐 Autenticación JWT**: Seguridad completa
- **☁️ Despliegue Automático**: Scripts incluidos para producción

## 📋 Requisitos
- **Python 3.9+**
- **Node.js 18+**
- **Git**

## 🛠️ Instalación y Desarrollo Local

### 1. Clonar el repositorio
```bash
git clone <tu-repo-url>
cd respaldo_app_ventas
```

### 2. Backend (FastAPI)
```bash
cd backend
# Crear entorno virtual
python -m venv venv
# Activar (Windows)
venv\Scripts\activate
# Instalar dependencias
pip install -r requirements.txt
# Iniciar servidor
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```
**API disponible en:** `http://localhost:8001`

### 3. Frontend (React + Vite)
```bash
cd frontend
# Instalar dependencias
npm install
# Iniciar servidor de desarrollo
npm run dev
### 3. Configurar variables de entorno (Opcional)
```bash
# Copiar archivo de ejemplo
cp .env.example backend/.env

# Editar según tu configuración
nano backend/.env
```

## 🌐 Despliegue en Producción

### 🚀 Opción 1: Configuración Automática Completa (Recomendado)

#### Paso 1: Configuración inicial del servidor
```bash
# Conectar al servidor como root
ssh root@tu-servidor

# Ejecutar script de configuración inicial
wget https://raw.githubusercontent.com/tu-usuario/tu-repo/main/setup_server.sh
chmod +x setup_server.sh
./setup_server.sh
```

Este script instala automáticamente:
- Python 3.11, Node.js 18, Nginx
- PostgreSQL (opcional)
- UFW firewall
- Certbot para SSL (opcional)

#### Paso 2: Desplegar la aplicación
```bash
# Cambiar a usuario normal
su - tu-usuario
cd /var/www/app-ventas

# Clonar repositorio
git clone <tu-repo-url> .

# Ejecutar despliegue automático
chmod +x deploy.sh
./deploy.sh
```

### 🔧 Opción 2: Configuración Manual

#### Paso 1: Preparar el servidor
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y python3.11 python3.11-venv python3.11-dev nodejs npm nginx git curl

# Crear directorio del proyecto
sudo mkdir -p /var/www/app-ventas
sudo chown -R $USER:$USER /var/www/app-ventas
```

#### Paso 2: Configurar servicios del sistema

**Servicio del backend:**
```bash
sudo cp backend.service.example /etc/systemd/system/backend.service
sudo systemctl daemon-reload
sudo systemctl enable backend
```

**Configuración de Nginx:**
```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/app-ventas
sudo ln -s /etc/nginx/sites-available/app-ventas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Paso 3: Desplegar aplicación
```bash
cd /var/www/app-ventas

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build
cp -r dist/* ../dist/

# Reiniciar servicios
sudo systemctl restart backend
sudo systemctl restart nginx
```

### 🔄 Actualizaciones en Producción

#### Método automático (Recomendado)
```bash
cd /var/www/app-ventas
./deploy.sh
```

#### Método manual
```bash
# Actualizar código
cd /var/www/app-ventas
git pull origin main

# Backup (opcional pero recomendado)
./backup_app.sh

# Recrear frontend
cd frontend
npm install
npm run build
cp -r dist/* ../dist/

# Reiniciar servicios
sudo systemctl restart backend
sudo systemctl restart nginx
```

### 🔒 Configuración SSL (Opcional pero recomendado)

```bash
# Instalar certificado Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com

# El certificado se renovará automáticamente
```

### 📊 Monitoreo y Logs

```bash
# Ver logs del backend
sudo journalctl -u backend -f

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Ver estado de servicios
sudo systemctl status backend
sudo systemctl status nginx
```

### 🛠️ Solución de Problemas

#### Backend no inicia
```bash
# Verificar logs detallados
sudo journalctl -u backend -n 50

# Verificar puerto 8000
sudo netstat -tlnp | grep 8000

# Probar manualmente
cd /var/www/app-ventas/backend
source venv/bin/activate
python3 -c "import main; print('OK')"
```

#### Frontend no carga
```bash
# Verificar archivos estáticos
ls -la /var/www/app-ventas/dist/

# Probar configuración de Nginx
sudo nginx -t

# Verificar permisos
sudo chown -R www-data:www-data /var/www/app-ventas/dist
```

#### Problemas de permisos
```bash
# Ajustar permisos generales
sudo chown -R www-data:www-data /var/www/app-ventas
sudo chmod -R 755 /var/www/app-ventas
sudo chmod -R 777 /var/www/app-ventas/backend/uploads
```

## 📁 Estructura del Proyecto
```
respaldo_app_ventas/
├── backend/                 # API FastAPI
│   ├── main.py             # Punto de entrada
│   ├── models.py           # Modelos SQLAlchemy
│   ├── schemas.py          # Pydantic schemas
│   ├── auth.py             # Autenticación JWT
│   ├── database.py         # Configuración BD
│   ├── routers/            # Endpoints API
│   └── uploads/            # Imágenes de logos
├── frontend/                # React + Vite
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/          # Páginas principales
│   │   └── AuthContext.jsx # Gestión de estado
│   └── dist/               # Build de producción
├── deploy.sh               # Script de despliegue automático
├── setup_server.sh        # Configuración inicial del servidor
├── backup_app.sh          # Script de backup
├── nginx.conf.example     # Configuración de ejemplo para Nginx
├── backend.service.example # Servicio de ejemplo para systemd
├── .env.example           # Variables de entorno de ejemplo
└── README.md
```

## 🔐 Credenciales por Defecto
- **Usuario:** `superadmin`
- **Contraseña:** `admin123`

## 📊 Funcionalidades del Sistema
- **Inventario**: CRUD completo de productos con códigos de barras
- **Punto de Venta**: Carrito inteligente con descuentos automáticos
- **Historial**: Seguimiento completo de ventas y transacciones
- **Dashboard**: Analytics y métricas en tiempo real
- **Administración**: Gestión de usuarios, proyectos y permisos
- **Promociones**: Sistema de descuentos por producto
- **Multi-sucursal**: Soporte para múltiples tiendas/proyectos

## 🤝 Contribución
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia
Este proyecto está bajo la Licencia MIT.
