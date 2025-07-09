from flask import Blueprint, request, jsonify
from services.profile_service import ProfileService

profile_bp = Blueprint('profile_bp', __name__)
service = ProfileService()

@profile_bp.route('/api/user/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    return service.get_profile(user_id)

@profile_bp.route('/api/user/profile/<user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()
    return service.update_profile(user_id, data)

@profile_bp.route('/api/user/profile/<user_id>/upload-photo', methods=['POST'])
def upload_photo(user_id):
    file = request.files.get('photo')
    return service.upload_photo(user_id, file)

@profile_bp.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    return service.serve_uploaded_file(filename)
