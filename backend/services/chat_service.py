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
            decrypted_msg = decrypt_message(encrypted_msg)
        except Exception as e:
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

        try:
            #  timestamp to datetime for compare
            read_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
        except Exception:
            return jsonify({"error": "Invalid timestamp format"}), 400

        mongo = current_app.mongo
        
        result = mongo.db.chat_messages.update_many(
            {
                'sender': chat_with,
                'receiver': user,
                'timestamp': {'$lte': read_time},
                'read_at': {'$exists': False}  
            },
            {
                '$set': {
                    'read_at': read_time,
                    'read': True
                }
            }
        )
        
        return jsonify({
            "message": "Read receipt updated",
            "updated_count": result.modified_count
        })

    def get_read_receipt(self, user, chat_with):
        if not user or not chat_with:
            return jsonify({"error": "Missing fields"}), 400

        mongo = current_app.mongo
        
        last_read_msg = mongo.db.chat_messages.find_one(
            {
                'sender': chat_with,
                'receiver': user,
                'read': True
            },
            sort=[('read_at', -1)]
        )
        
        # return last rea time
        if last_read_msg and last_read_msg.get('read_at'):
            read_at = last_read_msg['read_at']
            if isinstance(read_at, datetime):
                last_read = read_at.isoformat()
            else:
                try:
                    last_read = datetime.fromisoformat(str(read_at)).isoformat()
                except Exception:
                    last_read = None
        else:
            last_read = None

        return jsonify({"last_read": last_read})