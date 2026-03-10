import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Importar los módulos necesarios
from auth import verify_password, get_password_hash
from database import SessionLocal
import models

# Obtener una sesión
db = SessionLocal()

# Consultar el usuario superadmin
user = db.query(models.User).filter(models.User.username == "superadmin").first()

if user:
    print(f"Usuario encontrado: {user.username} ({user.role})")
    print(f"Hash en BD: {user.hashed_password}")
    
    # Probar verificación de contraseña
    test_password = "admin123"
    is_valid = verify_password(test_password, user.hashed_password)
    print(f"\n¿Contraseña válida (admin123)?: {is_valid}")
    
    if is_valid:
        print("\n✅ LOGIN FUNCIONARÍA CORRECTAMENTE")
    else:
        print("\n❌ La contraseña aún no es correcta")
        print("Necesita ser actualizada...")
else:
    print("Usuario superadmin no encontrado")

db.close()
