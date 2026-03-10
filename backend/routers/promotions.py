from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.get("/{project_id}", response_model=List[schemas.PromotionResponse])
def get_promotions(project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
         raise HTTPException(status_code=403, detail="Not enough permissions")
    
    return db.query(models.Promotion).filter(models.Promotion.project_id == project_id).all()

@router.post("/", response_model=schemas.PromotionResponse)
def create_promotion(promo: schemas.PromotionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == promo.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Sucursal suspendida")

    db_promo = models.Promotion(
        name=promo.name,
        discount_percentage=promo.discount_percentage,
        start_date=promo.start_date,
        end_date=promo.end_date,
        project_id=promo.project_id
    )

    # Añadir los productos indicados
    for pid in promo.product_ids:
        prod = db.query(models.Product).filter(models.Product.id == pid, models.Product.project_id == promo.project_id).first()
        if prod:
            db_promo.products.append(prod)

    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)
    return db_promo

@router.put("/{promo_id}", response_model=schemas.PromotionResponse)
def update_promotion(promo_id: int, promo: schemas.PromotionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == promo.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Sucursal suspendida")

    db_promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id, models.Promotion.project_id == promo.project_id).first()
    if not db_promo:
        raise HTTPException(status_code=404, detail="Promoción no hallada")

    db_promo.name = promo.name
    db_promo.discount_percentage = promo.discount_percentage
    db_promo.start_date = promo.start_date
    db_promo.end_date = promo.end_date

    # Limpiar y re-agregar productos
    db_promo.products.clear()
    for pid in promo.product_ids:
        prod = db.query(models.Product).filter(models.Product.id == pid, models.Product.project_id == promo.project_id).first()
        if prod:
            db_promo.products.append(prod)

    db.commit()
    db.refresh(db_promo)
    return db_promo

@router.delete("/{promo_id}")
def delete_promotion(promo_id: int, project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
         raise HTTPException(status_code=403, detail="Not enough permissions")
         
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id, models.Promotion.project_id == project_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoción no hallada")

    db.delete(promo)
    db.commit()
    return {"message": "Promoción terminada exitosamente"}
