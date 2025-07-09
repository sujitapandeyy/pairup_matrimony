from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_session import Session
from flask_pymongo import PyMongo
from config import Config
from socket_events import socketio, register_socketio_events

app = Flask(__name__)
app.config.from_object(Config)

mongo = PyMongo(app)
app.mongo = mongo

Session(app)
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
@app.route('/uploads/reports/<filename>')
def serve_report_proof(filename):
    return send_from_directory('uploads/reports', filename)
register_socketio_events(app)

from routes.register import register_bp
from routes.login import login_bp
from routes.interest import interest_bp
from routes.profile import profile_bp
from routes.match import match_bp
from routes.chat import chat_bp
from routes.user_routes import user_bp
from routes.report import report_bp

app.register_blueprint(register_bp, url_prefix='/auth')
app.register_blueprint(login_bp, url_prefix='/auth')
app.register_blueprint(interest_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(match_bp, url_prefix='/matches')
app.register_blueprint(chat_bp, url_prefix='/chat')
app.register_blueprint(user_bp)
app.register_blueprint(report_bp)

if __name__ == '__main__':
    socketio.init_app(app)
    socketio.run(app, host='127.0.0.1', port=5050, debug=True)
