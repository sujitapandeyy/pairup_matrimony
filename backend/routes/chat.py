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
