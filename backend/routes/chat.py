from flask import Blueprint, request, jsonify, current_app
from datetime import datetime

chat_bp = Blueprint('chat', __name__)

def serialize_message(msg):
    ts = msg.get('timestamp')
    if isinstance(ts, datetime):
        ts_iso = ts.isoformat()
    else:
        try:
            ts_iso = datetime.fromisoformat(ts).isoformat()
        except Exception:
            ts_iso = datetime.utcnow().isoformat()
    return {
        'sender': msg.get('sender', ''),
        'receiver': msg.get('receiver', ''),
        'message': msg.get('message', ''),
        'timestamp': ts_iso,
    }

@chat_bp.route('/history')
def chat_history():
    user1 = request.args.get('user1')
    user2 = request.args.get('user2')

    if not user1 or not user2:
        return jsonify({'error': 'Missing user1 or user2 parameter'}), 400

    messages_cursor = current_app.mongo.db.chat_threads.find({
        '$or': [
            {'sender': user1, 'receiver': user2},
            {'sender': user2, 'receiver': user1}
        ]
    }).sort('timestamp', 1)

    messages = [serialize_message(m) for m in messages_cursor]

    return jsonify({'messages': messages})
