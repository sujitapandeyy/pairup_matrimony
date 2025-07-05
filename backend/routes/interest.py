from flask import Blueprint, request, jsonify, current_app
from services.interest_service import InterestService

interest_bp = Blueprint('interest', __name__)

@interest_bp.route('/api/user/interests', methods=['POST'])
def save_user_interests():
    db = current_app.mongo.db
    data = request.get_json()
    email = data.get('email')

    service = InterestService(db)
    result, status = service.save_interests(email, data)
    return jsonify(result), status
