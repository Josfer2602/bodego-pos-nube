from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
import models, schemas, auth
from database import get_db

router = APIRouter(
    prefix="/sales",
    tags=["Sales"]
)

@router.get("/", response_model=List[schemas.SaleResponse])
def read_sales(project_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal se encuentra suspendida.")

    sales = db.query(models.Sale).filter(models.Sale.project_id == project_id).offset(skip).limit(limit).all()
    return sales

@router.post("/", response_model=schemas.SaleResponse)
def create_sale(sale: schemas.SaleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == sale.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal se encuentra suspendida para ventas.")

    today = date.today()

    total = 0.0
    processed_items = []

    # 1. Validar stock, aplicar promociones si las hay y calcular subtotal real
    for item in sale.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id, models.Product.project_id == sale.project_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Producto id {item.product_id} no encontrado")
        if product.stock < item.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para: {product.name}")

        # Comprobar Promociones Activas para calcular el precio final de venta.
        active_discount = 0
        for promo in product.promotions:
            if promo.start_date <= today <= promo.end_date:
                # Tomamos el mayor descuento válido de ser varios
                if promo.discount_percentage > active_discount:
                    active_discount = promo.discount_percentage
                    
        # Calcular final_price (que el frontend mandó precalculado o que el backend rectifica)
        final_price = product.price
        if active_discount > 0:
            final_price = product.price * (1 - (active_discount / 100.0))

        total += final_price * item.quantity
        processed_items.append({
            "product": product,
            "quantity": item.quantity,
            "sold_price": final_price
        })

    # 2. Guardar cabecera de la venta
    db_sale = models.Sale(total=total, project_id=sale.project_id, payment_method=sale.payment_method)
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    
    # 3. Guardar detalles
    for processed in processed_items:
        prod = processed["product"]
        prod.stock -= processed["quantity"]
        
        db_sale_detail = models.SaleDetail(
            sale_id=db_sale.id,
            product_id=prod.id,
            quantity=processed["quantity"],
            price=processed["sold_price"]
        )
        db.add(db_sale_detail)
        
    db.commit()
    db.refresh(db_sale)
    return db_sale
@router.delete("/{sale_id}")
def delete_sale(sale_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    # Verificar permisos (Superadmin o admin asignado a la tienda)
    project = db.query(models.Project).filter(models.Project.id == sale.project_id).first()
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar ventas de esta sucursal")

    # 1. Devolver el stock a cada producto
    for detail in sale.details:
        product = db.query(models.Product).filter(models.Product.id == detail.product_id).first()
        if product:
            product.stock += detail.quantity
            db.add(product)

    # 2. Eliminar la venta (la relación en modelos.py debería encargarce de los detalles si tiene cascade, 
    # pero para mayor seguridad borraremos los detalles primero si no estamos seguros de la configuración de sqlalchemy cascade)
    # Sin embargo, en SQLAlchemy 'relationship' suele requerir configure cascade="all, delete-orphan"
    # Vamos a eliminar los detalles explícitamente por seguridad.
    db.query(models.SaleDetail).filter(models.SaleDetail.sale_id == sale_id).delete()
    db.delete(sale)
    db.commit()

    return {"message": "Venta eliminada y stock restaurado exitosamente"}
