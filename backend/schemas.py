from pydantic import BaseModel, ConfigDict
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
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

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
    barcode: Optional[str] = None

# --- Barcode Schemas ---
class BarcodeCreate(BaseModel):
    code: str
    product_id: int
    stock: Optional[int] = 0
    expiration_date: Optional[date] = None

class BarcodeUpdate(BaseModel):
    stock: Optional[int] = None
    expiration_date: Optional[date] = None

class BarcodeResponse(BaseModel):
    id: int
    code: str
    product_id: int
    stock: int
    expiration_date: Optional[date] = None
    model_config = ConfigDict(from_attributes=True)

class ProductResponse(ProductBase):
    id: int
    project_id: int
    barcodes: List[BarcodeResponse] = []
    model_config = ConfigDict(from_attributes=True)

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
    model_config = ConfigDict(from_attributes=True)

# --- Sale Schemas ---
class SaleDetailBase(BaseModel):
    product_id: int
    quantity: int
    price: float
    barcode_id: Optional[int] = None

class SaleCreate(BaseModel):
    project_id: int 
    session_id: Optional[int] = None
    items: List[SaleDetailBase]
    payment_method: Optional[str] = "efectivo"

class SaleDetailResponse(SaleDetailBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class SaleResponse(BaseModel):
    id: int
    date: datetime
    total: float
    payment_method: Optional[str] = "efectivo"
    project_id: int
    session_id: Optional[int] = None
    details: List[SaleDetailResponse]
    model_config = ConfigDict(from_attributes=True)

# --- Cash Session Schemas ---
class CashSessionBase(BaseModel):
    project_id: int
    initial_cash: float

class CashSessionCreate(CashSessionBase):
    pass

class CashSessionClose(BaseModel):
    actual_cash: float
    actual_card: float
    actual_transfer: float

class CashSessionResponseUser(BaseModel):
    id: int
    username: str
    model_config = ConfigDict(from_attributes=True)

class CashSessionResponse(CashSessionBase):
    id: int
    user_id: int
    user: Optional[CashSessionResponseUser] = None
    status: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    expected_cash: float
    actual_cash: Optional[float] = None
    expected_card: float
    actual_card: Optional[float] = None
    expected_cash: float
    actual_cash: Optional[float] = None
    expected_card: float
    actual_card: Optional[float] = None
    expected_transfer: float
    actual_transfer: Optional[float] = None
    difference: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
