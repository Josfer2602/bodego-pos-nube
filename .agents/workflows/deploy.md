---
description: desplegar la aplicación con los últimos cambios desde GitHub
---

# Workflow: Desplegar Aplicación con Cambios

Este workflow ejecuta el despliegue completo de la aplicación POS ERP en el servidor de producción (`/var/www/app-ventas`). Incluye: git pull, actualización de dependencias, build del frontend y reinicio de servicios.

## Pasos

1. Confirmar con el usuario si quiere crear un backup antes de desplegar (recomendado).

2. Si el usuario acepta el backup, ejecutar el script de respaldo:
// turbo
```bash
cd /var/www/app-ventas && bash scripts/server/backup_app.sh
```

3. Ejecutar el script de despliegue completo:
// turbo
```bash
cd /var/www/app-ventas && bash scripts/server/deploy.sh
```

4. Verificar que los servicios estén activos después del despliegue:
// turbo
```bash
systemctl is-active backend && systemctl is-active nginx && echo "✅ Todos los servicios están activos"
```

5. Mostrar al usuario un resumen de lo que se hizo:
   - Si el backup fue creado, indicar la ruta del archivo
   - Indicar si el git pull trajo cambios nuevos
   - Confirmar que backend y nginx quedaron activos
   - Indicar las URLs de acceso a la aplicación: `http://tu-dominio.com` y la API `http://tu-dominio.com/api/`
