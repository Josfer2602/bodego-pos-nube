from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date

# --- Auth & User Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    class Config:
        orm_mode = True

# --- Project Schemas ---
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    membership_type: Optional[str] = "mensual"
    currency: Optional[str] = "PEN"
    theme_color: Optional[str] = "#2563eb"
    logo_url: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    membership_type: Optional[str] = None
    currency: Optional[str] = None
    theme_color: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: int
    class Config:
        orm_mode = True

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str
    cost: float
    margin: float
    price: float
    stock: int
    expiration_date: Optional[date] = None

class ProductCreate(ProductBase):
    project_id: int 

# --- Barcode Schemas ---
class BarcodeCreate(BaseModel):
    code: str
    product_id: int

class BarcodeResponse(BaseModel):
    id: int
    code: str
    product_id: int
    class Config:
        orm_mode = True

class ProductResponse(ProductBase):
    id: int
    project_id: int
    barcodes: List[BarcodeResponse] = []
    class Config:
        orm_mode = True

# --- Promotion Schemas ---
class PromotionBase(BaseModel):
    name: str
    discount_percentage: float
    start_date: date
    end_date: date

class PromotionCreate(PromotionBase):
    project_id: int
    product_ids: List[int]

class PromotionResponse(PromotionBase):
    id: int
    project_id: int
    products: List[ProductResponse] = []
    class Config:
        orm_mode = True

# --- Sale Schemas ---
class SaleDetailBase(BaseModel):
    product_id: int
    quantity: int
    price: float

class SaleCreate(BaseModel):
    project_id: int 
    items: List[SaleDetailBase]
    payment_method: Optional[str] = "efectivo"

class SaleDetailResponse(SaleDetailBase):
    id: int
    class Config:
        orm_mode = True

class SaleResponse(BaseModel):
    id: int
    date: datetime
    total: float
    payment_method: Optional[str] = "efectivo"
    project_id: int
    details: List[SaleDetailResponse]
    class Config:
        orm_mode = True
