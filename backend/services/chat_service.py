from flask import current_app, jsonify 
from datetime import datetime
from utils.encryption import decrypt_message

class ChatService:

    def serialize_message(self, msg):
        ts = msg.get('timestamp')
        if isinstance(ts, datetime):
            ts_iso = ts.isoformat()
        else:
            try:
                ts_iso = datetime.fromisoformat(ts).isoformat()
            except Exception:
                ts_iso = datetime.utcnow().isoformat()

        encrypted_msg = msg.get('message', '')
        try:
            # Decrypt message before returning
            decrypted_msg = decrypt_message(encrypted_msg)
        except Exception as e:
            # If decryption fails, fallback to raw message
            decrypted_msg = encrypted_msg

        return {
            'sender': msg.get('sender', ''),
            'receiver': msg.get('receiver', ''),
            'message': decrypted_msg,
            'timestamp': ts_iso,
        }

    def get_chat_history(self, user1, user2):
        if not user1 or not user2:
            return jsonify({'error': 'Missing user1 or user2 parameter'}), 400

        mongo = current_app.mongo
        messages_cursor = mongo.db.chat_messages.find({
            '$or': [
                {'sender': user1, 'receiver': user2},
                {'sender': user2, 'receiver': user1}
            ]
        }).sort('timestamp', 1)

        messages = [self.serialize_message(m) for m in messages_cursor]

        return jsonify({'messages': messages})

    def update_read_receipt(self, data):
        user = data.get('user')
        chat_with = data.get('chat_with')
        timestamp = data.get('timestamp')

        if not user or not chat_with or not timestamp:
            return jsonify({"error": "Missing fields"}), 400

        mongo = current_app.mongo
        mongo.db.read_receipts.update_one(
            {"user": user, "chat_with": chat_with},
            {"$set": {"last_read": timestamp}},
            upsert=True
        )
        return jsonify({"message": "Read receipt updated"})

    def get_read_receipt(self, user, chat_with):
        if not user or not chat_with:
            return jsonify({"error": "Missing fields"}), 400

        mongo = current_app.mongo
        doc = mongo.db.read_receipts.find_one({
            "user": user,
            "chat_with": chat_with
        })

        return jsonify({"last_read": doc.get("last_read") if doc else None})
