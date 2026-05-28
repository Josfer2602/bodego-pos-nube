from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Table, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime

user_project = Table('user_project', Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE')),
    Column('project_id', Integer, ForeignKey('projects.id', ondelete='CASCADE'))
)

promotion_product = Table('promotion_product', Base.metadata,
    Column('promotion_id', Integer, ForeignKey('promotions.id')),
    Column('product_id', Integer, ForeignKey('products.id'))
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String) # 'superadmin', 'admin', 'client'
    is_active = Column(Boolean, default=True)

    projects = relationship("Project", secondary=user_project, back_populates="users")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    
    # Configuraciones de Suscripción y Visuales
    status = Column(String, default="active") # 'active' o 'suspended'
    membership_type = Column(String, default="mensual") # 'mensual', 'trimestral', 'anual', 'permanente'
    currency = Column(String, default="PEN")
    theme_color = Column(String, default="#2563eb") # Color default (Azul Tailwind)
    logo_url = Column(String, nullable=True)

    # Configuración de boleta / ticket
    print_receipt = Column(Boolean, default=True)
    receipt_paper_width = Column(String, default="80mm") # '80mm' o '58mm'
    receipt_header = Column(String, default="RUC: 10000000000\nAv. Principal 123\nTel: 987 654 321")
    receipt_footer = Column(String, default="¡Gracias por su compra!")
    print_logo = Column(Boolean, default=True)

    users = relationship("User", secondary=user_project, back_populates="projects", passive_deletes=True)
    products = relationship("Product", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
    sales = relationship("Sale", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
    promotions = relationship("Promotion", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    
    # Finanzas
    cost = Column(Float, default=0.0) # Costo de Venta
    margin = Column(Float, default=0.0) # Margen de Ganancia (Ej. 30 para 30%)
    price = Column(Float) # Precio Público Sugerido
    
    stock = Column(Integer, default=0)
    expiration_date = Column(Date, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete='CASCADE'))

    project = relationship("Project", back_populates="products")
    sale_details = relationship("SaleDetail", back_populates="product", cascade="all, delete-orphan", passive_deletes=True)
    promotions = relationship("Promotion", secondary=promotion_product, back_populates="products")
    barcodes = relationship("Barcode", back_populates="product", cascade="all, delete-orphan", passive_deletes=True)

class CashSession(Base):
    __tablename__ = "cash_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    status = Column(String, default="open")  # open / closed
    
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    
    initial_cash = Column(Float, default=0.0)
    
    expected_cash = Column(Float, default=0.0)
    actual_cash = Column(Float, nullable=True)
    
    expected_card = Column(Float, default=0.0)
    actual_card = Column(Float, nullable=True)
    
    expected_transfer = Column(Float, default=0.0)
    actual_transfer = Column(Float, nullable=True)
    
    difference = Column(Float, nullable=True) # Total actual - Total expected
    
    project = relationship("Project")
    user = relationship("User")
    sales = relationship("Sale", back_populates="session")

class Barcode(Base):
    __tablename__ = "barcodes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True)
    stock = Column(Integer, default=0)
    expiration_date = Column(Date, nullable=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete='CASCADE'))
    product = relationship("Product", back_populates="barcodes")

class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    discount_percentage = Column(Float, default=0.0)
    start_date = Column(Date)
    end_date = Column(Date)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete='CASCADE'))

    # Nuevas Columnas para combos y mix & match
    promo_type = Column(String, default="simple") # 'simple', 'combo', 'mix_match'
    combo_price = Column(Float, nullable=True)
    mix_match_qty = Column(Integer, nullable=True)

    project = relationship("Project", back_populates="promotions")
    products = relationship("Product", secondary=promotion_product, back_populates="promotions")

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    total = Column(Float)
    payment_method = Column(String, default="efectivo")
    project_id = Column(Integer, ForeignKey("projects.id", ondelete='CASCADE'))
    session_id = Column(Integer, ForeignKey("cash_sessions.id", ondelete='SET NULL'), nullable=True)

    project = relationship("Project", back_populates="sales")
    session = relationship("CashSession", back_populates="sales")
    details = relationship("SaleDetail", back_populates="sale", cascade="all, delete-orphan", passive_deletes=True)

class SaleDetail(Base):
    __tablename__ = "sale_details"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete='CASCADE'))
    product_id = Column(Integer, ForeignKey("products.id", ondelete='CASCADE'))
    barcode_id = Column(Integer, ForeignKey("barcodes.id", ondelete='SET NULL'), nullable=True)
    quantity = Column(Integer)
    price = Column(Float) # El precio unitario real con el que se cobró (con o sin descuento aplicado)

    sale = relationship("Sale", back_populates="details")
    product = relationship("Product", back_populates="sale_details")
    barcode = relationship("Barcode")
