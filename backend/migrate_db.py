import sqlite3
import traceback

print("Starting migration...")
try:
    c = sqlite3.connect('app.db', timeout=5.0)
    c.execute('''CREATE TABLE IF NOT EXISTS cash_sessions (
        id INTEGER PRIMARY KEY, 
        project_id INTEGER, 
        user_id INTEGER, 
        status VARCHAR DEFAULT 'open', 
        opened_at DATETIME, 
        closed_at DATETIME, 
        initial_cash FLOAT DEFAULT 0.0, 
        expected_cash FLOAT DEFAULT 0.0, 
        actual_cash FLOAT, 
        expected_card FLOAT DEFAULT 0.0, 
        actual_card FLOAT, 
        expected_transfer FLOAT DEFAULT 0.0, 
        actual_transfer FLOAT, 
        difference FLOAT
    )''')
    print("Table created.")
    
    try:
        c.execute('ALTER TABLE sales ADD COLUMN session_id INTEGER')
        print("Column added.")
    except Exception as e:
        print("Column perhaps already exists:", e)
        
    c.commit()
    c.close()
    print("Migration successful.")
except Exception as e:
    print("MIGRATION FAILED:")
    traceback.print_exc()
