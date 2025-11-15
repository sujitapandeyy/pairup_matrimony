from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_session import Session
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager
from config import Config
from socket_events import socketio, register_socketio_events

app = Flask(__name__)
app.config.from_object(Config)

# Initialize MongoDB
mongo = PyMongo(app)
app.mongo = mongo

# Initialize JWT Manager - ADD THIS
jwt = JWTManager(app)

# Session configuration
Session(app)

# CORS configuration
CORS(app, supports_credentials=True, origins=["http://localhost:3000"])
# CORS(app, origins=["http://192.168.1.187:3000"], supports_credentials=True)

# JWT Error Handlers - ADD THESE
@jwt.unauthorized_loader
def unauthorized_callback(callback):
    return jsonify({
        'error': 'Missing Authorization Header',
        'message': 'Request does not contain a valid token'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(callback):
    return jsonify({
        'error': 'Invalid token',
        'message': 'Token verification failed'
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has expired',
        'message': 'Please login again'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has been revoked',
        'message': 'Please login again'
    }), 401

@app.route('/uploads/reports/<filename>')
def serve_report_proof(filename):
    return send_from_directory('uploads/reports', filename)

register_socketio_events(app)

# Register blueprints
from routes.register import register_bp
from routes.interest import interest_bp
from routes.profile import profile_bp
from routes.match import match_bp
from routes.chat import chat_bp
from routes.user_routes import user_bp
from routes.report import report_bp
from routes.auth_routes import auth_bp

app.register_blueprint(register_bp, url_prefix='/auth')
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(interest_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(match_bp, url_prefix='/matches')
app.register_blueprint(chat_bp, url_prefix='/chat')
app.register_blueprint(user_bp)
app.register_blueprint(report_bp)

if __name__ == '__main__':
    socketio.init_app(app)
    socketio.run(app, host='127.0.0.1', port=5050, debug=True)