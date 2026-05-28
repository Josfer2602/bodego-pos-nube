import requests
import json
import time

url = "https://juleso.shop/api/sales/"
payload = {
  "project_id": 1,
  "items": [
    {
      "product_id": 1,
      "quantity": 1,
      "price": 10.0
    }
  ],
  "payment_method": "efectivo"
}
# Make sure auth token is valid by looking at login response
try:
    print(requests.post(url, json=payload).text)
except Exception as e:
    pass
