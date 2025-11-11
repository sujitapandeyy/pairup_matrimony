from flask import Blueprint, request, jsonify
from services.profile_service import ProfileService

profile_bp = Blueprint('profile_bp', __name__)
service = ProfileService()

# --- Profile CRUD --- #
@profile_bp.route('/api/user/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    return service.get_profile(user_id)

@profile_bp.route('/api/user/profile/<user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.get_json()
    return service.update_profile(user_id, data)

# --- Profile Photo --- #
@profile_bp.route('/api/user/profile/<user_id>/upload-photo', methods=['POST'])
def upload_photo(user_id):
    file = request.files.get('photo')
    return service.upload_photo(user_id, file)

# --- Gallery Photos --- #
@profile_bp.route('/api/user/profile/<user_id>/gallery', methods=['GET'])
def get_gallery(user_id):
    return service.get_gallery(user_id)

@profile_bp.route('/api/user/profile/<user_id>/gallery', methods=['POST'])
def upload_gallery_photo(user_id):
    file = request.files.get('photo')
    return service.upload_gallery_photo(user_id, file)

# --- Serve uploaded files --- #
@profile_bp.route('/uploads/<filename>')
def serve_uploaded_file(filename):
    return service.serve_uploaded_file(filename)

@profile_bp.route('/api/user/profile/<user_id>/gallery/<image_id>', methods=['DELETE'])
def delete_gallery_photo(user_id, image_id):
    return service.delete_gallery_photo(user_id, image_id)

