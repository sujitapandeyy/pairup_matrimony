import os
from datetime import datetime
from bson.objectid import ObjectId
from flask import current_app, jsonify, send_from_directory
from werkzeug.utils import secure_filename

class ProfileService:
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif"}
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

    def allowed_file(self, filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def validate_file(self, file):
        if not file or file.filename == '':
            return "No file selected"
        if not self.allowed_file(file.filename):
            return f"Allowed file types: {', '.join(self.ALLOWED_EXTENSIONS)}"
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > self.MAX_FILE_SIZE:
            return f"File exceeds {self.MAX_FILE_SIZE // (1024 * 1024)}MB limit"
        return None

    def get_user_by_id_or_email(self, user_id):
        mongo = current_app.mongo
        user = None
        try:
            user_obj_id = ObjectId(user_id)
            user = mongo.db.users.find_one({"_id": user_obj_id})
        except Exception:
            user = mongo.db.users.find_one({"email": user_id})

        if not user:
            return None, None

        return user, user["_id"]

    def get_profile(self, user_id):
        mongo = current_app.mongo
        user, user_obj_id = self.get_user_by_id_or_email(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        details = mongo.db.user_details.find_one({"user_id": user_obj_id})
        interests = mongo.db.user_interests.find_one({"user_id": user_obj_id})

        profile = {
            "name": user.get("name"),
            "email": user.get("email"),
            "photo": user.get("photo"),
            "hobbies": details.get("hobbies", []) if details else [],
            "interestsCompleted": user.get("interests_completed", False),
        }

        if details:
            profile.update({
                "age": details.get("age"),
                "height": details.get("height"),
                "caste": details.get("caste"),
                "personality": details.get("personality"),
                "hobbies": details.get("hobbies", []) if details else [],
                "gender": details.get("gender"),
                "location": details.get("location"),
                "maritalStatus": details.get("marital_status"),
                "religion": details.get("religion"),
                "education": details.get("education"),
                "profession": details.get("profession"),
                "caption": details.get("caption", ""),
            })

        if interests:
            profile["lookingFor"] = interests.get("looking_for", {})

        return jsonify(profile), 200

    def update_profile(self, user_id, data):
        mongo = current_app.mongo
        user, user_obj_id = self.get_user_by_id_or_email(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if "name" in data:
            mongo.db.users.update_one({"_id": user_obj_id}, {"$set": {"name": data["name"]}})

        details_update = {}
        fields = {
            "age": "age",
            "height": "height",
            "caste": "caste",
            "gender": "gender",
            "location": "location",
            "maritalStatus": "marital_status",
            "religion": "religion",
            "education": "education",
            "profession": "profession",
            "caption": "caption",
            "personality": "personality",
            "hobbies": "hobbies",
            "latitude": "latitude", 
            "longitude": "longitude"
        }
        for key, db_key in fields.items():
            if key in data:
                details_update[db_key] = data[key]

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

        return self.get_profile(str(user_obj_id))

    def upload_photo(self, user_id, file):
        mongo = current_app.mongo
        validation_error = self.validate_file(file)
        if validation_error:
            return jsonify({"error": validation_error}), 400

        user, user_obj_id = self.get_user_by_id_or_email(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        ext = file.filename.rsplit('.', 1)[1].lower()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = secure_filename(f"profile_{user_obj_id}_{timestamp}.{ext}")

        upload_folder = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)

        try:
            file.save(filepath)
            photo_url = f"/uploads/{filename}"
            mongo.db.users.update_one(
                {"_id": user_obj_id},
                {"$set": {"photo": photo_url}}
            )

            return jsonify({
                "success": True,
                "photoUrl": photo_url,
                "message": "Profile photo updated successfully"
            }), 200

        except Exception as e:
            current_app.logger.error(f"Photo upload failed: {e}")
            if os.path.exists(filepath):
                os.remove(filepath)
            return jsonify({"error": "Failed to upload image"}), 500

    def serve_uploaded_file(self, filename):
        upload_folder = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
        try:
            return send_from_directory(upload_folder, filename)
        except FileNotFoundError:
            return jsonify({"error": "File not found"}), 404
