# backend/extensions.py

from flask_pymongo import PyMongo
from flask_session import Session
from flask_socketio import SocketIO

mongo = PyMongo()
session = Session()
socketio = SocketIO(cors_allowed_origins="http://localhost:3000")
