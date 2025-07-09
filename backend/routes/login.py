from flask import Blueprint, request, jsonify, session, current_app
from services.login_service import LoginService

login_bp = Blueprint('login', __name__)

@login_bp.route('/login', methods=['POST'])
def login_user():
    db = current_app.mongo.db
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    service = LoginService(db)
    result, status = service.login_user(email, password, session)
    return jsonify(result), status
