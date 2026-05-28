import sqlite3
import traceback

print("Starting migration...")
try:
    c = sqlite3.connect('pos.db', timeout=5.0)
    try:
        c.execute('ALTER TABLE sale_details ADD COLUMN barcode_id INTEGER')
        print("Column barcode_id added to sale_details.")
    except Exception as e:
        print("Column perhaps already exists:", e)
        
    c.commit()
    c.close()
    print("Migration successful.")
except Exception as e:
    print("MIGRATION FAILED:")
    traceback.print_exc()
