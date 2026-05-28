import os
from database import engine
from sqlalchemy import text

def migrate():
    # Detectar dialecto de la base de datos
    db_type = engine.name
    print(f"Base de datos detectada: {db_type}")

    with engine.begin() as conn:
        # === MIGRACIONES DE PROMOTIONS ===
        # 1. Agregar promo_type
        try:
            conn.execute(text("SELECT promo_type FROM promotions LIMIT 1"))
            print("La columna 'promo_type' ya existe.")
        except Exception:
            print("Agregando columna 'promo_type'...")
            conn.execute(text("ALTER TABLE promotions ADD COLUMN promo_type VARCHAR(50) DEFAULT 'simple'"))

        # 2. Agregar combo_price
        try:
            conn.execute(text("SELECT combo_price FROM promotions LIMIT 1"))
            print("La columna 'combo_price' ya existe.")
        except Exception:
            print("Agregando columna 'combo_price'...")
            if db_type == "sqlite":
                conn.execute(text("ALTER TABLE promotions ADD COLUMN combo_price REAL"))
            else:
                conn.execute(text("ALTER TABLE promotions ADD COLUMN combo_price FLOAT"))

        # 3. Agregar mix_match_qty
        try:
            conn.execute(text("SELECT mix_match_qty FROM promotions LIMIT 1"))
            print("La columna 'mix_match_qty' ya existe.")
        except Exception:
            print("Agregando columna 'mix_match_qty'...")
            conn.execute(text("ALTER TABLE promotions ADD COLUMN mix_match_qty INTEGER"))

        # === MIGRACIONES DE PROJECTS (CONFIGURACIONES DE TICKET) ===
        # 4. Agregar print_receipt
        try:
            conn.execute(text("SELECT print_receipt FROM projects LIMIT 1"))
            print("La columna 'print_receipt' ya existe en 'projects'.")
        except Exception:
            print("Agregando columna 'print_receipt' a 'projects'...")
            if db_type == "sqlite":
                conn.execute(text("ALTER TABLE projects ADD COLUMN print_receipt INTEGER DEFAULT 1"))
            else:
                conn.execute(text("ALTER TABLE projects ADD COLUMN print_receipt BOOLEAN DEFAULT TRUE"))

        # 5. Agregar receipt_paper_width
        try:
            conn.execute(text("SELECT receipt_paper_width FROM projects LIMIT 1"))
            print("La columna 'receipt_paper_width' ya existe en 'projects'.")
        except Exception:
            print("Agregando columna 'receipt_paper_width' a 'projects'...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN receipt_paper_width VARCHAR(20) DEFAULT '80mm'"))

        # 6. Agregar receipt_header
        try:
            conn.execute(text("SELECT receipt_header FROM projects LIMIT 1"))
            print("La columna 'receipt_header' ya existe en 'projects'.")
        except Exception:
            print("Agregando columna 'receipt_header' a 'projects'...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN receipt_header VARCHAR(500) DEFAULT 'RUC: 10000000000\nAv. Principal 123\nTel: 987 654 321'"))

        # 7. Agregar receipt_footer
        try:
            conn.execute(text("SELECT receipt_footer FROM projects LIMIT 1"))
            print("La columna 'receipt_footer' ya existe en 'projects'.")
        except Exception:
            print("Agregando columna 'receipt_footer' a 'projects'...")
            conn.execute(text("ALTER TABLE projects ADD COLUMN receipt_footer VARCHAR(500) DEFAULT '¡Gracias por su compra!'"))

        # 8. Agregar print_logo
        try:
            conn.execute(text("SELECT print_logo FROM projects LIMIT 1"))
            print("La columna 'print_logo' ya existe en 'projects'.")
        except Exception:
            print("Agregando columna 'print_logo' a 'projects'...")
            if db_type == "sqlite":
                conn.execute(text("ALTER TABLE projects ADD COLUMN print_logo INTEGER DEFAULT 1"))
            else:
                conn.execute(text("ALTER TABLE projects ADD COLUMN print_logo BOOLEAN DEFAULT TRUE"))

        # === MIGRACIONES DE SALE_DETAILS ===
        # 9. Agregar barcode_id
        try:
            conn.execute(text("SELECT barcode_id FROM sale_details LIMIT 1"))
            print("La columna 'barcode_id' ya existe en 'sale_details'.")
        except Exception:
            print("Agregando columna 'barcode_id' a 'sale_details'...")
            conn.execute(text("ALTER TABLE sale_details ADD COLUMN barcode_id INTEGER"))

    print("¡Migración de esquema completada exitosamente!")

if __name__ == "__main__":
    migrate()
