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

@chat_bp.route('/read_receipt', methods=['POST'])
def update_read_receipt():
    data = request.json
    user = data.get('user')
    chat_with = data.get('chat_with')
    timestamp = data.get('timestamp')

    if not user or not chat_with or not timestamp:
        return jsonify({"error": "Missing fields"}), 400

    current_app.mongo.db.read_receipts.update_one(
        {"user": user, "chat_with": chat_with},
        {"$set": {"last_read": timestamp}},
        upsert=True
    )
    return jsonify({"message": "Read receipt updated"})


@chat_bp.route('/read_receipt', methods=['GET'])
def get_read_receipt():
    user = request.args.get('user')
    chat_with = request.args.get('chat_with')

    if not user or not chat_with:
        return jsonify({"error": "Missing fields"}), 400

    doc = current_app.mongo.db.read_receipts.find_one({
        "user": user,
        "chat_with": chat_with
    })

    if not doc:
        return jsonify({"last_read": None})
    
    return jsonify({"last_read": doc.get("last_read")})


