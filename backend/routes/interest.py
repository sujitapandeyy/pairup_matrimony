from flask import Blueprint, request, jsonify, current_app
from bson.objectid import ObjectId

class InterestAPI:
    def __init__(self):
        self.interest_bp = Blueprint('interest', __name__)
        self.interest_bp.add_url_rule('/api/user/interests', view_func=self.save_interests, methods=['POST'])

    def save_interests(self):
        try:
            mongo = current_app.mongo
            data = request.json

            email = data.get('email')
            if not email:
                return jsonify({"success": False, "message": "Email is required"}), 400

            user = mongo.db.users.find_one({"email": email})
            if not user:
                return jsonify({"success": False, "message": "User not found"}), 404

            user_id = user['_id']

            partner_preferences = {
                "age_group": data.get("partner_age"),
                "gender": data.get("partner_gender"),
                "height": data.get("partner_height"),
                "marital_status": data.get("partner_marital_status"),
                "has_children": data.get("partner_children"),
                "religion": data.get("partner_religion"),
                "interfaith_open": data.get("partner_interfaith", False),
                "caste": data.get("partner_caste"),
                "caste_no_bar": data.get("partner_caste_no_bar", False),
                "personality": data.get("partner_personality", []),
                "hobbies": data.get("partner_hobbies", []),
                "pet_preference": data.get("partner_pets"),
                "education_level": data.get("partner_education"),
                "profession": data.get("partner_profession"),
                "family_type": data.get("partner_family_type"),
                "family_values": data.get("partner_family_values"),
                "living_preference": data.get("partner_living_pref"),
                "long_distance": data.get("partner_long_distance")
            }

            mongo.db.user_interests.update_one(
                {"user_id": user_id},
                {"$set": {"user_id": user_id, "looking_for": partner_preferences}},
                upsert=True
            )

            mongo.db.users.update_one(
                {"_id": user_id},
                {"$set": {"interests_completed": True}}
            )

            return jsonify({"success": True, "message": "Interests and partner preferences saved successfully."})

        except Exception as e:
            print("Error saving interests:", e)
            return jsonify({"success": False, "message": "Server error occurred."}), 500


interest_api = InterestAPI()
interest_bp = interest_api.interest_bp
