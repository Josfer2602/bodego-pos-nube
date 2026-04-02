import sys
import os
sys.path.append(os.path.abspath('.'))

from database import SessionLocal
import models, schemas
import traceback

db = SessionLocal()
try:
    res = db.query(models.Product).first()
    resp = schemas.ProductResponse.model_validate(res)
    print("SUCCESS SERIALIZE:", resp.id)
except Exception as e:
    print("GOT EXCEPTION:")
    traceback.print_exc()
finally:
    db.close()
