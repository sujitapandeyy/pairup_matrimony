from flask import Blueprint, jsonify, request, current_app

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/users', methods=['GET'])
def get_all_users():
    try:
        mongo = current_app.mongo
        users_cursor = mongo.db.users.find(
            {}, 
            {"_id": 0, "name": 1, "email": 1, "status": 1}
        )
        users = list(users_cursor)
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
