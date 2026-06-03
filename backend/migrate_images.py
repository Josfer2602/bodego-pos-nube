import sqlite3
import os
import sys

def migrate():
    if getattr(sys, 'frozen', False):
        app_data = os.path.join(os.environ.get('APPDATA', ''), 'Bodego')
        db_path = os.path.join(app_data, 'pos.db')
        if not os.path.exists(db_path):
            db_path = os.path.join(app_data, 'app.db')
    else:
        db_path = "pos.db"
        if not os.path.exists(db_path):
            db_path = "app.db"
            
    if not os.path.exists(db_path):
        print("No database found to migrate.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE products ADD COLUMN image_url VARCHAR")
        conn.commit()
        print("Migración de image_url completada.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
            print("La columna image_url ya existe.")
        else:
            print(f"Error al migrar image_url: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
