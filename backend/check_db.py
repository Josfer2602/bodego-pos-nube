import sqlite3
import os

# Conectar a la BD
db_path = 'pos.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Ver las tablas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print('Tablas:', cursor.fetchall())
    
    # Ver usuarios
    try:
        cursor.execute('SELECT id, username, role, hashed_password FROM users;')
        users = cursor.fetchall()
        print(f'\nUsuarios en BD ({len(users)}):')
        for user in users:
            print(f'  ID: {user[0]}, Username: {user[1]}, Role: {user[2]}')
            print(f'    Password hash: {user[3][:30]}...')
    except Exception as e:
        print(f'Error al consultar usuarios: {e}')
    
    conn.close()
else:
    print('BD no existe')
