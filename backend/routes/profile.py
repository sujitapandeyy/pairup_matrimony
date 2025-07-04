from flask import Blueprint, jsonify, current_app, request, send_from_directory
from bson.objectid import ObjectId
import os
import time
from werkzeug.utils import secure_filename
from datetime import datetime
from flask import send_file

profile_bp = Blueprint('profile_bp', __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_file(file):
    """Validate the uploaded file"""
    if not file or file.filename == '':
        return "No file selected"
    
    if not allowed_file(file.filename):
        return f"Allowed file types are: {', '.join(ALLOWED_EXTENSIONS)}"
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_length = file.tell()
    file.seek(0)
    
    if file_length > MAX_FILE_SIZE:
        return f"File size exceeds {MAX_FILE_SIZE // (1024 * 1024)}MB limit"
    
    return None

@profile_bp.route('/api/user/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    mongo = current_app.mongo
    try:
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"error": "Invalid user ID"}), 400

        user = mongo.db.users.find_one({"_id": user_obj_id}, {"password": 0})
        if not user:
            return jsonify({"error": "User not found"}), 404

        details = mongo.db.user_details.find_one({"user_id": user_obj_id})
        interests = mongo.db.user_interests.find_one({"user_id": user_obj_id})

        profile = {
            "name": user.get("name"),
            "email": user.get("email"),
            "photo": user.get("photo"),
              "personality": details.get("personality", []),
            "interestsCompleted": user.get("interests_completed", False),
        }

        if details:
            profile.update({
                "age": details.get("age"),
                "gender": details.get("gender"),
                "location": details.get("location"),
                "maritalStatus": details.get("marital_status"),
                "religion": details.get("religion"),
                "education": details.get("education"),
                "profession": details.get("profession"),
                "personality": details.get("personality", []),
                "caption": details.get("caption", ""),
                
            })

        if interests:
            profile["lookingFor"] = interests.get("looking_for", {})

        return jsonify(profile), 200

    except Exception as e:
        current_app.logger.error(f"Profile fetch error for user {user_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@profile_bp.route('/api/user/profile/<user_id>', methods=['PUT'])
def update_user_profile(user_id):
    mongo = current_app.mongo
    try:
        try:
            user_obj_id = ObjectId(user_id)
        except Exception:
            return jsonify({"error": "Invalid user ID"}), 400

        data = request.get_json() or {}

        if "name" in data:
            mongo.db.users.update_one(
                {"_id": user_obj_id},
                {"$set": {"name": data["name"]}}
            )

        details_update = {}
        if "age" in data:
            details_update["age"] = data["age"]
        if "gender" in data:
            details_update["gender"] = data["gender"]
        if "location" in data:
            details_update["location"] = data["location"]
        if "maritalStatus" in data:
            details_update["marital_status"] = data["maritalStatus"]
        if "religion" in data:
            details_update["religion"] = data["religion"]
        if "education" in data:
            details_update["education"] = data["education"]
        if "profession" in data:
            details_update["profession"] = data["profession"]
        if "caption" in data:
            details_update["caption"] = data["caption"]
        if "personality" in data:
            details_update["personality"] = data["personality"]

        if details_update:
            mongo.db.user_details.update_one(
                {"user_id": user_obj_id},
                {"$set": details_update},
                upsert=True
            )

        if "lookingFor" in data:
            mongo.db.user_interests.update_one(
                {"user_id": user_obj_id},
                {"$set": {"looking_for": data["lookingFor"]}},
                upsert=True
            )

        return get_user_profile(user_id)

    except Exception as e:
        current_app.logger.error(f"Profile update error for user {user_id}: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@profile_bp.route('/api/user/profile/<user_id>/upload-photo', methods=['POST'])
def upload_profile_photo(user_id):
    if 'photo' not in request.files:
        return jsonify({"error": "No photo file provided"}), 400

    file = request.files['photo']
    validation_error = validate_file(file)
    if validation_error:
        return jsonify({"error": validation_error}), 400

    try:
        user_obj_id = ObjectId(user_id)
    except Exception:
        return jsonify({"error": "Invalid user ID"}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    filename = secure_filename(f"profile_{user_id}_{timestamp}.{ext}")

    upload_folder = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
    os.makedirs(upload_folder, exist_ok=True)

    filepath = os.path.join(upload_folder, filename)
    
    try:
        file.save(filepath)

        photo_url = f"/uploads/{filename}"
        current_app.mongo.db.users.update_one(
            {"_id": user_obj_id},
            {"$set": {"photo": photo_url}}
        )

        return jsonify({
            "success": True,
            "photoUrl": photo_url,
            "message": "Profile photo updated successfully"
        }), 200

    except Exception as e:
        current_app.logger.error(f"Photo upload failed for user {user_id}: {str(e)}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "Failed to process image upload"}), 500

@profile_bp.route('/uploads/<filename>')
def uploaded_file(filename):
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    try:
        return send_from_directory(upload_folder, filename)
    except FileNotFoundError:
        current_app.logger.error(f"Requested file not found: {filename}")
        return jsonify({"error": "File not found"}), 404