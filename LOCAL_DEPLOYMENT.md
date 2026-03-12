# 🚀 Guía de Despliegue Local y GitHub

Esta guía te explica paso a paso cómo ejecutar tu aplicación POS ERP en tu servidor local y cómo subir cambios a GitHub.

## 📋 Requisitos Previos

- **Python 3.9+** instalado
- **Node.js 18+** instalado
- **Git** instalado y configurado
- Repositorio GitHub configurado

---

## 🖥️ LANZAMIENTO EN SERVIDOR LOCAL

### Paso 1: Preparar el Backend

```bash
# Navegar al directorio del proyecto
cd respaldo_app_ventas_20260309_234304

# Ir al directorio del backend
cd backend

# Instalar dependencias de Python
pip install -r requirements.txt

# Verificar que todo esté correcto
python -c "import main; print('✅ Backend listo')"
```

### Paso 2: Preparar el Frontend

```bash
# Desde la raíz del proyecto, ir al frontend
cd frontend

# Instalar dependencias de Node.js
npm install

# Verificar que todo esté correcto
npm run build
```

### Paso 3: Iniciar los Servicios

#### Opción A: Iniciar Backend y Frontend por separado

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### Opción B: Usar scripts automatizados (Recomendado)

```bash
# Para desarrollo completo (requiere que ambos servicios estén configurados)
# Ejecutar desde la raíz del proyecto
./start_dev.sh  # Si tienes este script creado
```

### Paso 4: Verificar que todo funciona

1. **Backend API:** Abre `http://127.0.0.1:8001/docs` en tu navegador
2. **Frontend Web:** Abre `http://localhost:5173` en tu navegador

### Paso 5: Probar el Login

**Credenciales por defecto:**
- **Usuario:** `superadmin`
- **Contraseña:** `admin123`

---

## 📤 SUBIR CAMBIOS A GITHUB

### Paso 1: Verificar el estado del repositorio

```bash
# Ver qué archivos han cambiado
git status
```

### Paso 2: Agregar los cambios

```bash
# Agregar todos los archivos modificados
git add .

# O agregar archivos específicos
git add nombre-del-archivo
```

### Paso 3: Crear un commit

```bash
# Crear commit con mensaje descriptivo
git commit -m "Descripción de los cambios realizados"

# Ejemplos de mensajes de commit:
git commit -m "feat: agregar nueva funcionalidad de inventario"
git commit -m "fix: corregir error en login de usuarios"
git commit -m "docs: actualizar documentación del README"
git commit -m "style: mejorar estilos del dashboard"
```

### Paso 4: Subir a GitHub

```bash
# Subir los cambios a la rama master
git push origin master

# Si es la primera vez o tienes una rama diferente:
git push -u origin master
```

### Paso 5: Verificar en GitHub

1. Ve a tu repositorio en GitHub
2. Verifica que los cambios aparecen en la rama `master`
3. Revisa que todos los archivos se subieron correctamente

---

## 🔄 FLUJO COMPLETO DE TRABAJO

### Desarrollo Diario:

```bash
# 1. Hacer cambios en el código
# 2. Probar localmente
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8001
cd frontend && npm run dev

# 3. Verificar que funciona
# 4. Subir cambios (Opción manual)
git add .
git commit -m "Descripción de cambios"
git push origin master

# 5. Subir cambios (Opción rápida)
./git_sync.sh "Descripción de cambios"
```

### Solución de Problemas Comunes:

#### Backend no inicia:
```bash
# Verificar puerto 8001
netstat -ano | findstr :8001

# Matar proceso si es necesario
taskkill /F /PID <PID_DEL_PROCESO>
```

#### Frontend no carga:
```bash
# Limpiar cache de Node.js
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Git tiene conflictos:
```bash
# Ver estado
git status

# Resolver conflictos manualmente
# Luego continuar
git add .
git commit -m "Resolver conflictos de merge"
```

---

## 🌐 URLs DE ACCESO

- **Aplicación Web:** `http://localhost:5173`
- **API Backend:** `http://127.0.0.1:8001`
- **Documentación API:** `http://127.0.0.1:8001/docs`
- **Repositorio GitHub:** `https://github.com/Josfer2602/app-ventas`

---

## 📞 SOPORTE

Si tienes problemas:

1. Verifica que todos los requisitos estén instalados
2. Revisa que los puertos 5173 y 8001 estén libres
3. Consulta los logs de error en las terminales
4. Verifica que las dependencias se instalaron correctamente

---

## ✅ Checklist de Verificación

- [ ] Python 3.9+ instalado
- [ ] Node.js 18+ instalado
- [ ] Dependencias de backend instaladas (`pip install -r requirements.txt`)
- [ ] Dependencias de frontend instaladas (`npm install`)
- [ ] Backend corriendo en puerto 8001
- [ ] Frontend corriendo en puerto 5173
- [ ] Login funciona con superadmin/admin123
- [ ] Git configurado con usuario y email
- [ ] Repositorio GitHub conectado
- [ ] Cambios subidos exitosamente

---

*Última actualización: Marzo 2026*</content>
<parameter name="filePath">c:\Users\josen\respaldo_app_ventas_20260309_234304\LOCAL_DEPLOYMENT.md