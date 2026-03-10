import sqlite3
from passlib.context import CryptContext

# Configuración
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db_path = 'pos.db'

# Conectar a la BD
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Obtener el usuario superadmin
cursor.execute('SELECT username, hashed_password FROM users WHERE username="superadmin";')
user = cursor.fetchone()

if user:
    username, hashed_pw = user
    print(f'Usuario: {username}')
    print(f'Hash almacenado: {hashed_pw}')
    
    # Probar con la contraseña
    test_password = 'admin123'
    print(f'\nProbando contraseña: {test_password}')
    
    try:
        is_valid = pwd_context.verify(test_password, hashed_pw)
        print(f'Contraseña válida: {is_valid}')
    except Exception as e:
        print(f'Error al verificar: {e}')
        
    # Crear un nuevo hash para probar
    new_hash = pwd_context.hash(test_password)
    print(f'\nNuevo hash generado: {new_hash}')
    is_valid_new = pwd_context.verify(test_password, new_hash)
    print(f'Verificación del nuevo hash: {is_valid_new}')
else:
    print('Usuario no encontrado')

conn.close()
