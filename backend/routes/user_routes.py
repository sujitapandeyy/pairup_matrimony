from flask import Blueprint, request, jsonify, current_app
from services.user_service import UserService

user_bp = Blueprint('user', __name__)
user_service = UserService()

@user_bp.route('/api/users', methods=['GET'])
def get_all_users():
    return user_service.get_all_users()

@user_bp.route('/api/users/<email>/status', methods=['PATCH'])
def update_user_status(email):
    data = request.json
    new_status = data.get('status')
    return user_service.update_user_status(email, new_status)
