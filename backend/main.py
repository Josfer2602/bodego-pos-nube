from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base, SessionLocal
from dotenv import load_dotenv
import models
import auth
from routers import products, sales, auth as auth_router, users, projects, promotions, analytics
import os

# Cargar variables de entorno
load_dotenv()

# Configuración desde variables de entorno
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

# Asegurar que existe el directorio uploads para los logos
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Crear las tablas en la base de datos (SQLite)
models.Base.metadata.create_all(bind=engine)

# Script para crear cuentas iniciales básicas
# la UI muestra credenciales de superadmin, así que la base de datos debe
# tener al menos ese usuario. Podemos añadir también una cuenta "admin"
# normal si se desea.
def init_db():
    db = SessionLocal()
    # superadmin obligatorio
    superadmin = db.query(models.User).filter(models.User.username == "superadmin").first()
    if not superadmin:
        hashed_pw = auth.get_password_hash("admin123") # Clave por defecto
        new_super = models.User(username="superadmin", hashed_password=hashed_pw, role="superadmin")
        db.add(new_super)
    # opcional: crear un usuario admin genérico para pruebas
    admin = db.query(models.User).filter(models.User.username == "admin").first()
    if not admin:
        hashed_pw = auth.get_password_hash("admin123")
        new_admin = models.User(username="admin", hashed_password=hashed_pw, role="admin")
        db.add(new_admin)
    db.commit()
    db.close()

init_db()

app = FastAPI(title="POS ERP System", description="Backend para el Sistema de Ventas (ERP Completo)")

# Configurar CORS para permitir peticiones desde el frontend (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servimos de forma estática la carpeta donde Pillow redimensiona y guarda las imágenes
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Incluir routers
app.include_router(auth_router.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(promotions.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {
        "status": "success",
        "message": "Bienvenido a la API del ERP POS"
    }
