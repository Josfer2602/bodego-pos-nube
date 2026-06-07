# Documentación de Scripts

Esta carpeta contiene todos los scripts necesarios para construir la aplicación en Windows y para instalarla/desplegarla en un servidor Linux. Se han organizado en dos subcarpetas para mayor claridad.

## 📁 `scripts/windows/`
Estos scripts se ejecutan exclusivamente en tu computadora local con Windows. Tienen la tarea de compilar el código fuente y generar un instalador `.exe`.

- **`build.bat`**: Este es el archivo principal que debes usar. Al darle doble clic, compilará el código de React (Frontend), empaquetará el código de Python (Backend) usando PyInstaller, y finalmente llamará a Inno Setup para construir el instalador final.
- **`installer.iss`**: Es la configuración de "Inno Setup". Le dice al compilador cómo debe lucir la ventana del instalador, qué archivos debe incluir (el `.exe` del backend), y dónde crear los accesos directos.

**Uso:** Simplemente dale doble clic a `build.bat` y espera a que termine. El instalador final aparecerá en la carpeta `/Output/` en la raíz de tu proyecto.

## 📁 `scripts/server/`
Estos scripts están diseñados para ser ejecutados en tu servidor web (ej. Hetzner con Ubuntu Linux). Sirven para configurar el entorno y mantener la aplicación actualizada.

- **`setup_server.sh`**: Instala todas las dependencias del sistema operativo (Python, Node.js, Nginx, Certbot) la primera vez que creas el servidor. Solo se usa una vez en la vida del servidor.
- **`deploy.sh`**: El script mágico de actualización. Se encarga de descargar el último código desde GitHub (`git pull`), actualizar librerías, compilar el frontend y reiniciar los servicios. Es el que ejecutas cada vez que quieres poner cambios "en vivo".
- **`backup_app.sh`**: Script de seguridad que comprime la base de datos y la carpeta de uploads antes de un despliegue, guardándolo en la carpeta `backups`.
- **`nginx.conf.example`**: Archivo de configuración base para Nginx (el motor web). Define cómo se muestran los archivos estáticos y cómo se conecta el servidor con el backend de FastAPI.
- **`backend.service.example`**: Archivo de configuración para SystemD. Le enseña al servidor cómo mantener a Python (FastAPI) corriendo en segundo plano las 24 horas y cómo reiniciarlo si hay algún problema.

**Uso:** La mayoría de las veces, para actualizar tu aplicación web en la nube, solo tendrás que ejecutar desde la carpeta de tu proyecto en el servidor:
```bash
bash scripts/server/deploy.sh
```
