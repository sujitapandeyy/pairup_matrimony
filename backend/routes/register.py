from flask import Blueprint, request, jsonify, current_app
from services.register_service import RegisterService

register_bp = Blueprint('register', __name__)

@register_bp.route('/register', methods=['POST'])
def register_user():
    db = current_app.mongo.db
    data = request.get_json()

    service = RegisterService(db)
    result, status = service.register_user(data)
    return jsonify(result), status
