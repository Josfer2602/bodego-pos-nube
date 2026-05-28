import sqlite3

db_path = "pos.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1;")
    conn.commit()
    print("Column is_active added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error (maybe column already exists?): {e}")

conn.close()
