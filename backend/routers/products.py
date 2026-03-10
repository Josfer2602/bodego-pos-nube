from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import math
from datetime import date
import models, schemas, auth
from database import get_db

router = APIRouter(
    prefix="/products",
    tags=["Products"]
)

@router.get("/", response_model=List[schemas.ProductResponse])
def read_products(project_id: int, skip: int = 0, limit: int = 1000, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal se encuentra suspendida. Contacta con soporte.")

    products = db.query(models.Product).filter(models.Product.project_id == project_id).order_by(models.Product.id.desc()).offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def read_product(product_id: int, project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.project_id == project_id).first()
    
    if product is None or not project:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    if current_user.role != "superadmin" and project not in current_user.projects:
         raise HTTPException(status_code=403, detail="Not enough permissions")

    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal se encuentra suspendida.")

    return product

@router.post("/", response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == product.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal está suspendida para nuevos registros")
        
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == product.project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal está suspendida para ediciones")

    db_product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.project_id == product.project_id).first()
    if db_product is None:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(product_id: int, project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    db_product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.project_id == project_id).first()
    
    if db_product is None or not project:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal está suspendida para eliminaciones")
        
    db.delete(db_product)
    db.commit()
    return {"message": "Producto eliminado exitosamente"}
@router.get("/barcode/{code}", response_model=schemas.ProductResponse)
def lookup_by_barcode(code: str, project_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    barcode = db.query(models.Barcode).filter(models.Barcode.code == code).first()
    if not barcode:
        raise HTTPException(status_code=404, detail="Código de barras no encontrado")
    product = barcode.product
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if product.project_id != project_id:
        raise HTTPException(status_code=403, detail="Este código pertenece a otra sucursal")
    return product

@router.post("/{product_id}/barcodes", response_model=schemas.BarcodeResponse)
def add_barcode_to_product(product_id: int, barcode_in: schemas.BarcodeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    project = product.project
    if current_user.role != "superadmin" and project not in current_user.projects:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    existing = db.query(models.Barcode).filter(models.Barcode.code == barcode_in.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Este código ya está registrado")
    new_barcode = models.Barcode(code=barcode_in.code, product_id=product_id)
    db.add(new_barcode)
    db.commit()
    db.refresh(new_barcode)
    return new_barcode

@router.post("/bulk-upload", response_model=dict)
async def bulk_upload_products(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or (current_user.role != "superadmin" and project not in current_user.projects):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    if project.status != "active" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="La sucursal está suspendida para nuevos registros")

    if not file.filename.endswith(('.xlsx', '.xls')):
         raise HTTPException(status_code=400, detail="Formato de archivo inválido. Sube un archivo Excel (.xlsx o .xls)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Validar columnas requeridas
        required_columns = ['name', 'cost', 'margin', 'price', 'stock']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
             raise HTTPException(status_code=400, detail=f"Faltan columnas requeridas: {', '.join(missing_columns)}")

        added_count = 0
        updated_count = 0
        
        for index, row in df.iterrows():
            name = str(row['name']).strip()
            if not name or name == 'nan':
                 continue
                 
            try:
                cost = float(row['cost']) if pd.notna(row['cost']) else 0.0
                margin = float(row['margin']) if pd.notna(row['margin']) else 0.0
                price = float(row['price']) if pd.notna(row['price']) else 0.0
                stock = int(row['stock']) if pd.notna(row['stock']) else 0
                
                exp_date = None
                if 'expiration_date' in row and pd.notna(row['expiration_date']):
                    if isinstance(row['expiration_date'], pd.Timestamp):
                        exp_date = row['expiration_date'].date()
                    else:
                        exp_date = pd.to_datetime(str(row['expiration_date'])).date()
            except (ValueError, TypeError):
                 continue 
            
            existing_product = db.query(models.Product).filter(models.Product.name == name, models.Product.project_id == project_id).first()
            
            if existing_product:
                 existing_product.cost = cost
                 existing_product.margin = margin
                 existing_product.price = price
                 existing_product.stock = stock
                 existing_product.expiration_date = exp_date
                 updated_count += 1
            else:
                 new_product = models.Product(
                     name=name,
                     cost=cost,
                     margin=margin,
                     price=price,
                     stock=stock,
                     expiration_date=exp_date,
                     project_id=project_id
                 )
                 db.add(new_product)
                 added_count += 1
                 
        db.commit()
        return {
            "message": "Archivo procesado exitosamente",
            "added": added_count,
            "updated": updated_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error procesando el archivo Excel: {str(e)}")
