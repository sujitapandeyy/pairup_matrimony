# services/login_service.py
from werkzeug.security import check_password_hash

class LoginService:
    def __init__(self, db):
        self.db = db

    def login_user(self, email, password):
        if not email or not password:
            return {
                "success": False,
                "message": "Email and password are required"
            }, 400

        try:
            user = self.db.users.find_one({"email": email})

            if not user:
                return {
                    "success": False,
                    "message": "Invalid credentials"
                }, 401

            if not check_password_hash(user.get("password", ""), password):
                return {
                    "success": False,
                    "message": "Invalid credentials"
                }, 401

            status = user.get("status", "active")
            if status != "active":
                return {
                    "success": False,
                    "message": f"Account is {status}. Please contact support."
                }, 403

            user_data = {
                "id": str(user.get("_id")),
                "email": user.get("email"),
                "name": user.get("name"),
                "role": user.get("role", "user"),
                "status": status,
                "interests_completed": user.get("interests_completed", False)
            }

            return {
                "success": True,
                "message": "Login successful",
                "user": user_data
            }, 200

        except Exception as e:
            print(f"Login error: {str(e)}")
            return {
                "success": False,
                "message": "An error occurred during login"
            }, 500