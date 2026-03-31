from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db
import os
import uuid
from PIL import Image

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.post("/", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_superadmin_user)):
    new_project = models.Project(**project.dict())
    
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_data: schemas.ProjectUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sucursal")
        
    for key, value in project_data.dict(exclude_unset=True).items():
        if key == 'status' and current_user.role != "superadmin":
             raise HTTPException(status_code=403, detail="Solo un superadmin puede suspender o activar sucursales")
        setattr(project, key, value)
        
    db.commit()
    db.refresh(project)
    return project

@router.post("/{project_id}/assign/{user_id}")
def assign_user_to_project(project_id: int, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not project or not user:
        raise HTTPException(status_code=404, detail="Proyecto o Usuario no encontrado")
        
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sucursal")
    
    if project not in user.projects:
        user.projects.append(project)
        db.commit()
    return {"message": "Usuario asignado exitosamente al proyecto"}

@router.get("/", response_model=List[schemas.ProjectResponse])
def get_user_projects(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role == "superadmin":
        return db.query(models.Project).all()
    # Si es admin normal o client, solo los que tiene asignados
    return current_user.projects

@router.get("/{project_id}/users", response_model=List[schemas.UserResponse])
def get_project_users(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sucursal")
    return project.users

@router.delete("/{project_id}")
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_superadmin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    
    try:
        # 1. Limpiar logo
        if project.logo_url and project.logo_url.startswith("/uploads/"):
            try:
                filename = project.logo_url.replace("/uploads/", "")
                file_path = os.path.join("uploads", filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Error borrando archivo de logo: {e}")

        # 2. Limpieza robusta vía SQL directo (evita StaleDataError de SQLAlchemy en SQLite)
        # Esto asegura que se borren todas las dependencias sin conflictos de sincronización de la sesión
        params = {"pid": project_id}
        
        # Secuencia de limpieza profunda respetando claves foráneas
        db.execute(text("DELETE FROM user_project WHERE project_id = :pid"), params)
        db.execute(text("DELETE FROM sale_details WHERE sale_id IN (SELECT id FROM sales WHERE project_id = :pid)"), params)
        db.execute(text("DELETE FROM sales WHERE project_id = :pid"), params)
        db.execute(text("DELETE FROM promotion_product WHERE promotion_id IN (SELECT id FROM promotions WHERE project_id = :pid) OR product_id IN (SELECT id FROM products WHERE project_id = :pid)"), params)
        db.execute(text("DELETE FROM promotions WHERE project_id = :pid"), params)
        db.execute(text("DELETE FROM barcodes WHERE product_id IN (SELECT id FROM products WHERE project_id = :pid)"), params)
        db.execute(text("DELETE FROM products WHERE project_id = :pid"), params)
        db.execute(text("DELETE FROM projects WHERE id = :pid"), params)
        
        db.commit()
        return {"message": "Sucursal eliminada exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar sucursal: {str(e)}")

@router.post("/{project_id}/logo")
async def upload_project_logo(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="No tienes acceso a esta sucursal")

    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")

    file_extension = ".png" # Forzamos salida a png
    filename = f"{uuid.uuid4()}{file_extension}"
    filepath = os.path.join("uploads", filename)
    
    try:
        image = Image.open(file.file)
        # Redimensiona inteligentemente con Pillow reteniendo aspecto (max 500x500)
        image.thumbnail((500, 500), Image.Resampling.LANCZOS)
        
        # Crear capa de 500x500 transparente
        background = Image.new('RGBA', (500, 500), (255, 255, 255, 0))
        # Centrar la imagen redimensionada
        offset = (
            (500 - image.width) // 2,
            (500 - image.height) // 2
        )
        
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
            
        background.paste(image, offset, image)
        background.save(filepath, "PNG", optimize=True)
        
        project.logo_url = f"/uploads/{filename}"
        db.commit()
        return {"logo_url": project.logo_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
