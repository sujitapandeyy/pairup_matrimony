from flask import Flask
from flask_cors import CORS
from flask_session import Session
from flask_pymongo import PyMongo
from flask_socketio import SocketIO
import os

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "uploads")
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

from config import Config
app.config.from_object(Config)

mongo = PyMongo(app)
app.mongo = mongo
Session(app)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

from routes.register import register_bp
from routes.login import login_bp
from routes.interest import interest_bp
from routes.profile import profile_bp
from routes.match import match_bp
from routes.faceregister import face_bp 

app.register_blueprint(register_bp, url_prefix='/auth')
app.register_blueprint(login_bp, url_prefix='/auth')
app.register_blueprint(interest_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(match_bp, url_prefix='/matches')
app.register_blueprint(face_bp, url_prefix='/face')

if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5050, debug=True)
