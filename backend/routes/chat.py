from flask import Blueprint, request, jsonify
from services.chat_service import ChatService

chat_bp = Blueprint('chat', __name__)
chat_service = ChatService()

@chat_bp.route('/history')
def chat_history():
    user1 = request.args.get('user1')
    user2 = request.args.get('user2')
    return chat_service.get_chat_history(user1, user2)

@chat_bp.route('/read_receipt', methods=['POST'])
def update_read_receipt():
    data = request.get_json()
    return chat_service.update_read_receipt(data)

@chat_bp.route('/read_receipt', methods=['GET'])
def get_read_receipt():
    user = request.args.get('user')
    chat_with = request.args.get('chat_with')
    return chat_service.get_read_receipt(user, chat_with)

@chat_bp.route('/unread-count', methods=['GET'])
def get_unread_count():
    """Get count of unread messages for the current user"""
    try:
        current_user = get_jwt_identity()  # Get user email/id from JWT token
        
        # Get unread count from chat service
        unread_count = chat_service.get_unread_count(current_user)
        
        return jsonify({
            'success': True,
            'count': unread_count
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500