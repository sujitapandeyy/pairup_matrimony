from bson.objectid import ObjectId

class InterestService:
    def __init__(self, db):
        self.users = db.users
        self.user_interests = db.user_interests

    def save_interests(self, email, data):
        if not email:
            return {"success": False, "message": "Email is required"}, 400

        user = self.users.find_one({"email": email})
        if not user:
            return {"success": False, "message": "User not found"}, 404

        user_id = user["_id"]

        partner_preferences = {
            "age_group": data.get("partner_age"),
            "gender": data.get("partner_gender"),
            "height": data.get("partner_height"),
            "marital_status": data.get("partner_marital_status"),
            "religion": data.get("partner_religion"),
            "caste": data.get("partner_caste"),
            "personality": data.get("partner_personality", []),
            # "hobbies": data.get("partner_hobbies", []),
            "pet_preference": data.get("partner_pets"),
            "education_level": data.get("partner_education"),
            "profession": data.get("partner_profession"),
            "family_type": data.get("partner_family_type"),
            "family_values": data.get("partner_family_values"),
            "living_preference": data.get("partner_living_pref"),
            "long_distance": data.get("partner_long_distance")
        }

        self.user_interests.update_one(
            {"user_id": user_id},
            {"$set": {"user_id": user_id, "looking_for": partner_preferences}},
            upsert=True
        )

        self.users.update_one(
            {"_id": user_id},
            {"$set": {"interests_completed": True}}
        )

        return {"success": True, "message": "Interests and partner preferences saved successfully."}, 200
