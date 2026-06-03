# Guía de Despliegue: Versión Demo Online

Este documento explica cómo desplegar la versión Demo de **Bodego POS** en cualquier servidor en la nube (Hostinger, AWS, DigitalOcean, Render, etc.).

## 1. El "Modo Demo"
El código cuenta con una variable de entorno llamada `DEMO_MODE`. 
Cuando está activada (`DEMO_MODE=True`), el sistema funciona con total normalidad, pero **bloquea acciones críticas** como:
- Cambiar contraseñas.
- Desactivar/anular a otros usuarios.
Esto garantiza que los usuarios que ingresen a probar el sistema no puedan bloquear tu cuenta principal ni cambiar tus credenciales de acceso.

## 2. Compilar con Docker
La mejor forma de encender esta Demo en un servidor es utilizando **Docker**. El archivo `Dockerfile` incluido en la raíz del proyecto ya tiene toda la "receta" lista.

Si estás en un servidor con Docker instalado, solo tienes que ejecutar:

```bash
# 1. Construir la Imagen (Esto empacará el Frontend y el Backend juntos)
docker build -t bodego-pos-demo .

# 2. Encender el Contenedor
docker run -d -p 80:8000 --name bodego-demo bodego-pos-demo
```

### ¿Qué hace el comando `docker run`?
- `-d`: Ejecuta el sistema en segundo plano para que se quede encendido siempre.
- `-p 80:8000`: Toma el puerto interno `8000` (FastAPI) y lo conecta al puerto web estándar `80` (HTTP) de tu servidor. Así cualquiera que ponga la IP de tu servidor verá el programa de inmediato.

## 3. Datos de Prueba (Base de Datos)
Por defecto, la carpeta Docker ignorará el archivo `pos.db` que tengas en tu computadora para evitar subir datos reales por accidente.

Para tener datos en tu Demo:
1. Una vez encendido el contenedor, se creará una base de datos vacía.
2. Ingresa y crea un usuario "superadmin" para ti.
3. Ingresa y crea un usuario "admin" llamado **Demo** (ej. usuario: `demo`, clave: `demo123`).
4. Publica esos datos (`demo` / `demo123`) en la página web donde ofreces tu sistema para que los prospectos puedan ingresar.

*Nota: Al estar el `DEMO_MODE=True` configurado dentro del Dockerfile, el usuario demo jamás podrá cambiar la contraseña ni borrarte la cuenta.*
