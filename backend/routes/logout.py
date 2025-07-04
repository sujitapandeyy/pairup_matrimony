from flask import Blueprint, jsonify, session

logout_bp = Blueprint('logout', __name__)

@logout_bp.route('/logout', methods=['POST'])
def logout_user():
    session.clear()
    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    }), 200
