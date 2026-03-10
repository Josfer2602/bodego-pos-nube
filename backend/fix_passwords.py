import sqlite3
from passlib.context import CryptContext

# Configuración
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db_path = 'pos.db'

# Generar nuevo hash para admin123
new_hash = pwd_context.hash('admin123')
print(f'Nuevo hash para admin123: {new_hash}')

# Conectar a la BD
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Actualizar superadmin
cursor.execute('UPDATE users SET hashed_password = ? WHERE username = "superadmin"', (new_hash,))
print(f'Actualizado superadmin: {cursor.rowcount} fila(s)')

# Actualizar admin
cursor.execute('UPDATE users SET hashed_password = ? WHERE username = "admin"', (new_hash,))
print(f'Actualizado admin: {cursor.rowcount} fila(s)')

conn.commit()
conn.close()

print('\n✅ Contraseñas actualizadas correctamente')
print('Ambos usuarios ahora usan: admin123')
