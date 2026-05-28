from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    if user.role == "superadmin" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Only superadmins can create other superadmins")
        
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El nombre de usuario ya está registrado")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(auth.get_current_active_user)):
    return current_user

@router.get("/", response_model=List[schemas.UserResponse])
def get_users(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_admin_user)):
    return db.query(models.User).all()

@router.put("/{user_id}/password", response_model=schemas.UserResponse)
def update_user_password(user_id: int, pw_data: schemas.UserPasswordUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_superadmin_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    hashed_password = auth.get_password_hash(pw_data.new_password)
    db_user.hashed_password = hashed_password
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}/status", response_model=schemas.UserResponse)
def toggle_user_status(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_superadmin_user)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes anular tu propio usuario")

    db_user.is_active = not db_user.is_active
    db.commit()
    db.refresh(db_user)
    return db_user

