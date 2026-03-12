import requests

def test_login():
    url = "http://127.0.0.1:8001/auth/login"
    data = {
        "username": "superadmin",
        "password": "admin123"
    }
    print(f"Testing login at {url}...")
    try:
        # FastAPI OAuth2PasswordRequestForm expects form data
        response = requests.post(url, data=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_login()
