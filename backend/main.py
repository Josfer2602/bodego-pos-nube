from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base, SessionLocal
from dotenv import load_dotenv
import models
import auth
from routers import products, sales, auth as auth_router, users, projects, promotions, analytics, cash, clients
import os

import logging
from logging.handlers import RotatingFileHandler
import sys

# Configuración de logging en APPDATA
if getattr(sys, 'frozen', False):
    app_data_path = os.path.join(os.environ.get('APPDATA', ''), 'Bodego')
else:
    app_data_path = os.path.dirname(os.path.abspath(__file__))

os.makedirs(app_data_path, exist_ok=True)
log_path = os.path.join(app_data_path, 'bodego.log')

logging.basicConfig(
    handlers=[RotatingFileHandler(log_path, maxBytes=1000000, backupCount=5, encoding='utf-8')],
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

# Configuración desde variables de entorno
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
# Asegurar que incluimos localhost y 127.0.0.1 explícitamente si no están
DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
ENV_ORIGINS = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = list(set((DEFAULT_ORIGINS + "," + ENV_ORIGINS).strip(",").split(",")))
logger.info(f"ALLOWED_ORIGINS: {ALLOWED_ORIGINS}")

# Crear las tablas en la base de datos (SQLite)
models.Base.metadata.create_all(bind=engine)

# Correr migraciones de columnas faltantes de promociones
try:
    from migrate_promos import migrate as run_promo_migrations
    run_promo_migrations()
except Exception as e:
    logger.error(f"Error corriendo migracion de promociones: {e}")

try:
    from migrate_images import migrate as run_image_migrations
    run_image_migrations()
except Exception as e:
    logger.error(f"Error corriendo migracion de imagenes: {e}")

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

import sys

# Determinar base_path para PyInstaller (donde se extrae 'dist')
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    cwd_path = os.path.join(os.environ.get('APPDATA', ''), 'Bodego')
else:
    base_path = os.path.dirname(os.path.abspath(__file__))
    cwd_path = base_path

UPLOAD_DIR = os.path.join(cwd_path, os.getenv("UPLOAD_DIR", "uploads"))
dist_path = os.path.join(base_path, "dist")

# Crear uploads si no existe
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Servimos de forma estática la carpeta donde Pillow redimensiona y guarda las imágenes
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Incluir routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(sales.router, prefix="/api")
app.include_router(promotions.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(cash.router, prefix="/api")
app.include_router(clients.router, prefix="/api")

@app.get("/api/logs", dependencies=[Depends(auth.get_current_superadmin_user)])
def get_logs():
    try:
        if os.path.exists(log_path):
            with open(log_path, 'r', encoding='utf-8') as f:
                return {"logs": f.read()}
        return {"logs": "Archivo de logs no encontrado."}
    except Exception as e:
        return {"logs": f"Error al leer logs: {str(e)}"}

from fastapi.responses import FileResponse

# Servir Frontend compilado (Vite dist) si existe
if os.path.isdir(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    # Catch-all para el enrutamiento del frontend (React Router)
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        if catchall.startswith("uploads/"):
            raise HTTPException(status_code=404, detail="Not Found")
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {
            "status": "success",
            "message": f"Bienvenido a la API del ERP POS. Compila el frontend en '{dist_path}' para servir la UI."
        }

if __name__ == "__main__":
    import uvicorn
    import webview
    import threading
    import sys
    import time

    def start_server():
        uvicorn.run(app, host="127.0.0.1", port=8000)

    # Start FastAPI server in a daemon thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    class DesktopAPI:
        def save_csv(self, filename, content):
            try:
                main_win = [w for w in webview.windows if w.title == "Bodego POS"]
                window = main_win[0] if main_win else webview.windows[-1]
                result = window.create_file_dialog(webview.SAVE_DIALOG, directory='', save_filename=filename)
                if result:
                    path = result[0] if isinstance(result, (tuple, list)) else result
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    return True
            except Exception as e:
                print("Error saving CSV:", e)
            return False

    api = DesktopAPI()
    
    # Generate Splash Screen HTML
    import os
    import base64
    if getattr(sys, 'frozen', False):
        logo_path = os.path.join(dist_path, "logo.png")
    else:
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "logo.png"))
    
    logo_b64 = ""
    try:
        with open(logo_path, "rb") as lf:
            logo_b64 = "data:image/png;base64," + base64.b64encode(lf.read()).decode('utf-8')
    except:
        pass

    splash_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ margin: 0; padding: 0; background: linear-gradient(135deg, #312783, #1e185c); color: white; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; user-select: none; -webkit-user-select: none; }}
            .logo {{ width: 120px; height: 120px; background: white; border-radius: 30px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; overflow: hidden; }}
            .logo img {{ width: 80%; height: 80%; object-fit: contain; }}
            h1 {{ margin: 0; font-size: 32px; font-weight: 900; letter-spacing: 1px; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }}
            p {{ margin: 5px 0 0 0; color: #E94E1B; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; font-size: 12px; }}
            .loader {{ width: 200px; height: 4px; background: rgba(255,255,255,0.1); margin-top: 40px; border-radius: 2px; overflow: hidden; }}
            .progress {{ width: 0%; height: 100%; background: #E94E1B; animation: load 3.5s ease-in-out forwards; }}
            .footer {{ position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; font-size: 11px; color: rgba(255,255,255,0.6); }}
            @keyframes load {{ 0% {{ width: 0%; }} 40% {{ width: 60%; }} 80% {{ width: 80%; }} 100% {{ width: 100%; }} }}
        </style>
    </head>
    <body>
        <div class="logo">
            <img src="{logo_b64}" onerror="this.style.display='none'; this.parentNode.innerHTML='<span style=\\'color:#312783;font-size:40px;font-weight:900;\\'>B</span>';" />
        </div>
        <h1>Bodego POS</h1>
        <p>Iniciando Sistema</p>
        <div class="loader"><div class="progress"></div></div>
        <div class="footer">© 2026 <b>www.bodego.app</b> • Todos los derechos reservados</div>
    </body>
    </html>
    """
    
    splash_file_path = os.path.join(app_data_path, "splash.html")
    with open(splash_file_path, "w", encoding="utf-8") as f:
        f.write(splash_html)

    # Create windows
    splash = webview.create_window("Cargando...", splash_file_path, frameless=True, width=500, height=350, resizable=False, on_top=True)
    main_window = webview.create_window("Bodego POS", "http://127.0.0.1:8000", js_api=api, hidden=True, min_size=(1024, 768), maximized=True)

    def startup():
        # Wait for the splash animation and backend to fully load
        time.sleep(3.6)
        main_window.show()
        splash.destroy()

    webview.start(startup)
