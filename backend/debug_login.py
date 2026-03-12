import requests
import sqlite3
import os
import sys

def check_backend():
    print("--- Verificando Backend ---")
    url = "http://127.0.0.1:8001/"
    try:
        response = requests.get(url, timeout=5)
        print(f"✅ Backend respondiendo en {url}")
        print(f"   Status: {response.status_code}")
        print(f"   Data: {response.json()}")
    except Exception as e:
        print(f"❌ Error conectando al backend: {e}")

def check_database():
    print("\n--- Verificando Base de Datos ---")
    # Intentar detectar cuál base de datos se está usando
    db_files = ["app.db", "pos.db"]
    for db_file in db_files:
        if os.path.exists(db_file):
            print(f"📄 Archivo encontrado: {db_file}")
            try:
                conn = sqlite3.connect(db_file)
                cursor = conn.cursor()
                cursor.execute("SELECT username, role FROM users WHERE username='superadmin'")
                user = cursor.fetchone()
                if user:
                    print(f"   ✅ Usuario 'superadmin' encontrado en {db_file}")
                else:
                    print(f"   ⚠️ Usuario 'superadmin' NO encontrado en {db_file}")
                conn.close()
            except Exception as e:
                print(f"   ❌ Error leyendo {db_file}: {e}")
        else:
            print(f"❓ Archivo no encontrado: {db_file}")

def test_auth():
    print("\n--- Verificando Autenticación ---")
    url = "http://127.0.0.1:8001/auth/login"
    data = {"username": "superadmin", "password": "admin123"}
    try:
        response = requests.post(url, data=data, timeout=5)
        if response.status_code == 200:
            print("✅ Login exitoso con superadmin/admin123")
        else:
            print(f"❌ Login fallido (Status {response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ Error en la prueba de auth: {e}")

if __name__ == "__main__":
    # Cambiar al directorio del script si es necesario
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    check_backend()
    check_database()
    test_auth()
