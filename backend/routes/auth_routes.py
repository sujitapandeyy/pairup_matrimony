from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash
from datetime import timedelta

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    print(f"🔐 Login attempt for: {email}")

    if not email or not password:
        return jsonify({
            'success': False,
            'message': 'Missing email or password'
        }), 400

    user = current_app.mongo.db.users.find_one({'email': email})
    
    if not user:
        print(f"❌ User not found: {email}")
        return jsonify({
            'success': False,
            'message': 'Invalid credentials'
        }), 401
    
    if not check_password_hash(user.get('password'), password):
        print(f"❌ Invalid password for: {email}")
        return jsonify({
            'success': False,
            'message': 'Invalid credentials'
        }), 401

    if user.get('status') != 'active':
        print(f"⚠️ Inactive account: {email} - Status: {user.get('status')}")
        return jsonify({
            'success': False,
            'message': f'Account is {user.get("status")}'
        }), 403

    # Create JWT tokens
    access_token = create_access_token(
        identity=email,
        expires_delta=timedelta(hours=1)
    )
    refresh_token = create_refresh_token(
        identity=email,
        expires_delta=timedelta(days=30)
    )

    print(f"✅ Login successful for: {email}")
    print(f"🔑 Access token generated: {access_token[:20]}...")

    response_data = {
        'success': True,
        'message': 'Login successful',
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': {
            'id': str(user.get('_id')),
            'email': user['email'],
            'name': user.get('name'),
            'interests_completed': user.get('interests_completed', False),
            'role': user.get('role', 'user'),
            'status': user.get('status', 'active'),
        }
    }
    
    print(f"📤 Sending response with keys: {response_data.keys()}")
    return jsonify(response_data), 200


@auth_bp.route('/verify-token', methods=['GET'])
@jwt_required()
def verify_token():
    current_email = get_jwt_identity()
    user = current_app.mongo.db.users.find_one({'email': current_email})
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'valid': True,
        'user': {
            'id': str(user.get('_id')),
            'email': user['email'],
            'name': user.get('name'),
            'interests_completed': user.get('interests_completed', False),
            'role': user.get('role', 'user'),
            'status': user.get('status', 'active'),
        }
    }), 200