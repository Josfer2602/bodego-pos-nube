---
description: Subir todas las modificaciones al repositorio GitHub
---

// turbo-all

## Pasos para hacer push a GitHub

1. Verificar el estado actual del repositorio (archivos modificados, nuevos, eliminados):
```powershell
git -C c:\Users\josen\respaldo_app_ventas_20260309_234304 status
```

2. Agregar todos los cambios al staging area:
```powershell
git -C c:\Users\josen\respaldo_app_ventas_20260309_234304 add -A
```

3. Crear el commit con un mensaje descriptivo que incluya la fecha actual:
```powershell
git -C c:\Users\josen\respaldo_app_ventas_20260309_234304 commit -m "feat: actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```

4. Subir los cambios al repositorio remoto (rama actual):
```powershell
git -C c:\Users\josen\respaldo_app_ventas_20260309_234304 push
```
