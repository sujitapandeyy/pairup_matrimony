from flask_socketio import SocketIO, join_room, emit
from flask import current_app, request
from datetime import datetime
from bson import ObjectId

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

online_users = set()

def get_room_id(user1, user2):
    if not user1 or not user2:
        return None
    return '_'.join(sorted([user1, user2]))

def serialize_objectid(obj):
    if isinstance(obj, list):
        return [serialize_objectid(o) for o in obj]
    if isinstance(obj, dict):
        return {k: serialize_objectid(v) for k, v in obj.items()}
    if isinstance(obj, ObjectId):
        return str(obj)
    return obj

def register_socketio_events(app):
    @socketio.on('connect')
    def handle_connect():
        user_email = request.args.get('email')
        if user_email:
            online_users.add(user_email)
            print(f"✅ {user_email} connected")
            emit('online_users', list(online_users), broadcast=True)

    @socketio.on('disconnect')
    def handle_disconnect():
        user_email = request.args.get('email')
        if user_email:
            online_users.discard(user_email)
            print(f"❌ {user_email} disconnected")
            emit('online_users', list(online_users), broadcast=True)

    @socketio.on('join_room')
    def on_join(data):
        user1 = data.get('user1')
        user2 = data.get('user2')
        room = get_room_id(user1, user2)
        if room:
            print(f"✅ {user1} joined room with {user2}")
            join_room(room)
        else:
            print("❌ Invalid join_room data:", data)

    @socketio.on('send_message')
    def handle_send_message(data):
        required_keys = ['sender', 'receiver', 'message']
        if not all(k in data for k in required_keys):
            print("❌ Invalid message data received:", data)
            return

        room = get_room_id(data['sender'], data['receiver'])
        chat = {
            "sender": data['sender'],
            "receiver": data['receiver'],
            "message": data['message'],
            "timestamp": datetime.utcnow()
        }

        try:
            db = current_app.mongo.db
            result = db.chat_threads.insert_one(chat)
            chat['_id'] = str(result.inserted_id)  
        except Exception as e:
            print("❌ Error saving message to DB:", str(e))

        emit('receive_message', {
            **chat,
            "timestamp": chat["timestamp"].isoformat(),
            "_id": chat.get('_id'),
        }, room=room)
