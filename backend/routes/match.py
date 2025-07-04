from flask import Blueprint, jsonify, request
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime

class MatchAPI:
    def __init__(self):
        self.match_bp = Blueprint('match_bp', __name__)
        
        self.client = MongoClient("mongodb://localhost:27017/")
        self.db = self.client["pairup_db"]
        self.user_collection = self.db["users"]
        self.user_detail_collection = self.db["user_details"]
        self.swipe_collection = self.db["swipes"]
        self.notifications = self.db["notifications"]
        self.matches = self.db["matches"]

        self.match_bp.add_url_rule('/get_profiles', view_func=self.get_profiles, methods=['GET'])
        self.match_bp.add_url_rule('/get_profile_by_email', view_func=self.get_profile_by_email, methods=['GET'])
        self.match_bp.add_url_rule('/get_profiles_by_emails', view_func=self.get_profiles_by_emails, methods=['POST'])
        self.match_bp.add_url_rule('/swipe', view_func=self.swipe, methods=['POST'])
        self.match_bp.add_url_rule('/notifications', view_func=self.get_notifications, methods=['GET'])
        self.match_bp.add_url_rule('/notifications/read', view_func=self.mark_read, methods=['POST'])
        self.match_bp.add_url_rule('/ignore/<notification_id>', view_func=self.ignore_request, methods=['DELETE'])
        self.match_bp.add_url_rule('/get_mutual_matches', view_func=self.get_mutual_matches, methods=['GET'])

    def build_photo_url(self, request, raw_photo):
        if raw_photo and raw_photo.startswith('/'):
            return f"{request.host_url.rstrip('/')}{raw_photo}"
        else:
            return f"{request.host_url.rstrip('/')}/default-profile.jpg"

    def get_profiles(self):
        current_email = request.args.get("email")
        if not current_email:
            return jsonify({"error": "Missing email"}), 400

        liked_swipes = self.swipe_collection.find({
            "swiper": current_email,
            "liked": True
        })
        liked_emails = {s.get("target") for s in liked_swipes if s.get("target")}

        liked_by = self.swipe_collection.find({
            "target": current_email,
            "liked": True
        })
        liked_by_emails = {s.get("swiper") for s in liked_by if s.get("swiper")}

        profiles = []
        for user in self.user_collection.find():
            email = user.get("email")
            if email == current_email or email in liked_emails:
                continue

            details = self.user_detail_collection.find_one({"user_id": user["_id"]})
            if not details:
                continue

            is_match = email in liked_by_emails
            photo_url = self.build_photo_url(request, user.get("photo"))

            profiles.append({
                "name": user.get("name"),
                "email": email,
                "age": details.get("age"),
                "location": details.get("location"),
                "profession": details.get("profession"),
                "education": details.get("education"),
                "bio": details.get("caption", "No bio available."),
                "personality": details.get("personality", []),
                "images": [photo_url],
                "is_match": is_match
            })

        return jsonify(profiles), 200

    def get_profile_by_email(self):
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Missing email"}), 400

        user = self.user_collection.find_one({"email": email})
        if not user:
            return jsonify({"error": "User not found"}), 404

        details = self.user_detail_collection.find_one({"user_id": user["_id"]})
        if not details:
            return jsonify({"error": "User details not found"}), 404

        photo_url = self.build_photo_url(request, user.get("photo"))

        profile = {
            "name": user.get("name"),
            "email": email,
            "age": details.get("age"),
            "location": details.get("location"),
            "profession": details.get("profession"),
            "education": details.get("education"),
            "bio": details.get("caption", "No bio available."),
            "personality": details.get("personality", []),
            "images": [photo_url]
        }
        return jsonify(profile), 200

    def get_profiles_by_emails(self):
        data = request.get_json()
        emails = data.get('emails', [])
        if not emails or not isinstance(emails, list):
            return jsonify({"error": "Invalid emails"}), 400

        users = list(self.user_collection.find({"email": {"$in": emails}}))
        profiles = []

        for user in users:
            details = self.user_detail_collection.find_one({"user_id": user["_id"]})
            if not details:
                continue

            raw_photo = user.get("photo")
            photo_url = (
                f"{request.host_url.rstrip('/')}{raw_photo}"
                if raw_photo else f"{request.host_url.rstrip('/')}/default-profile.jpg"
            )

            profiles.append({
                "name": user.get("name"),
                "email": user.get("email"),
                "age": details.get("age"),
                "location": details.get("location"),
                "profession": details.get("profession"),
                "education": details.get("education"),
                "bio": details.get("caption", "No bio available."),
                "personality": details.get("personality", []),
                "images": [photo_url],
            })

        return jsonify(profiles), 200

    def swipe(self):
        data = request.get_json()
        swiper = data.get("swiper_email")
        target = data.get("target_email")
        liked = data.get("liked")

        if not swiper or not target or liked is None:
            return jsonify({"error": "Missing required fields"}), 400

        self.swipe_collection.update_one(
            {"swiper": swiper, "target": target},
            {"$set": {"liked": liked, "timestamp": datetime.utcnow()}},
            upsert=True
        )

        self.notifications.delete_many({
            "to": target,
            "from": swiper,
            "type": "request"
        })

        if liked:
            reverse_swipe = self.swipe_collection.find_one({
                "swiper": target,
                "target": swiper,
                "liked": True
            })

            existing_match = self.matches.find_one({
                "users": {"$all": [swiper, target]}
            })

            if reverse_swipe and not existing_match:
                match_doc = {
                    "users": sorted([swiper, target]),
                    "timestamp": datetime.utcnow()
                }
                inserted = self.matches.insert_one(match_doc)

                self.notifications.delete_many({
                    "type": "request",
                    "$or": [
                        {"to": swiper, "from": target},
                        {"to": target, "from": swiper}
                    ]
                })

                for user_, other in [(swiper, target), (target, swiper)]:
                    self.notifications.insert_one({
                        "to": user_,
                        "from": other,
                        "type": "match",
                        "message": f"You matched with {other}!",
                        "read": False,
                        "timestamp": datetime.utcnow()
                    })

                return jsonify({
                    "message": "It's a match!",
                    "match": True,
                    "match_id": str(inserted.inserted_id)
                }), 200
            else:
                if not reverse_swipe:
                    self.notifications.insert_one({
                        "to": target,
                        "from": swiper,
                        "type": "request",
                        "message": f"{swiper} liked your profile!",
                        "read": False,
                        "timestamp": datetime.utcnow()
                    })

                return jsonify({
                    "message": "Like recorded",
                    "match": False
                }), 200
        else:
            existing_match = self.matches.find_one({
                "users": {"$all": [swiper, target]}
            })
            if existing_match:
                self.matches.delete_one({"_id": existing_match["_id"]})
                self.notifications.delete_many({
                    "type": "match",
                    "$or": [
                        {"to": swiper, "from": target},
                        {"to": target, "from": swiper}
                    ]
                })

            return jsonify({"message": "Dislike recorded"}), 200

    def get_notifications(self):
        email = request.args.get("email")
        if not email:
            return jsonify({"error": "Missing email"}), 400

        notes = list(self.notifications.find({
            "to": email,
            "type": {"$in": ["request", "match"]}
        }).sort("timestamp", -1).limit(50))

        for n in notes:
            n["_id"] = str(n["_id"])
            n["timestamp"] = n["timestamp"].isoformat()

            sender_email = n["from"]
            sender_profile = self.user_collection.find_one({"email": sender_email})
            if sender_profile:
                n["sender_name"] = sender_profile.get("name", "Unknown")
                details = self.user_detail_collection.find_one({"user_id": sender_profile["_id"]})
                if details:
                    n["sender_age"] = details.get("age")
                    n["sender_location"] = details.get("location")

        return jsonify(notes), 200

    def mark_read(self):
        data = request.get_json()
        notification_id = data.get("notification_id")
        if not notification_id:
            return jsonify({"error": "Missing ID"}), 400

        try:
            result = self.notifications.update_one(
                {"_id": ObjectId(notification_id)},
                {"$set": {"read": True}}
            )
            if result.modified_count == 0:
                return jsonify({"error": "Notification not found"}), 404
            return jsonify({"message": "Marked read"}), 200
        except Exception as e:
            return jsonify({"error": f"Invalid ID format: {e}"}), 400

    def ignore_request(self, notification_id):
        try:
            notification = self.notifications.find_one({"_id": ObjectId(notification_id)})
            if not notification:
                return jsonify({"error": "Notification not found"}), 404

            self.notifications.delete_one({"_id": ObjectId(notification_id)})

            if notification.get("type") == "request":
                swiper = notification.get("from")
                target = notification.get("to")
                self.swipe_collection.update_one(
                    {"swiper": swiper, "target": target},
                    {"$set": {"liked": False, "timestamp": datetime.utcnow()}},
                    upsert=True
                )

            return jsonify({"message": "Request ignored"}), 200
        except Exception as e:
            return jsonify({"error": f"Invalid ID format: {e}"}), 400

    def get_mutual_matches(self):
        email = request.args.get("email")
        print(f"[DEBUG] Received logged-in user email: {email}")

        if not email:
            return jsonify({"error": "Missing email"}), 400

        matched_docs = self.matches.find({"users": email})
        matched_emails = []
        for match in matched_docs:
            users = match.get("users", [])
            other_user = [u for u in users if u != email]
            if other_user:
                matched_emails.append(other_user[0])

        if not matched_emails:
            return jsonify({
                "logged_in_user": email,
                "matches": []
            }), 200

        users = list(self.user_collection.find({"email": {"$in": matched_emails}}))
        profiles = []

        for user in users:
            details = self.user_detail_collection.find_one({"user_id": user["_id"]})
            if not details:
                continue

            raw_photo = user.get("photo")
            photo_url = (
                f"{request.host_url.rstrip('/')}{raw_photo}"
                if raw_photo else f"{request.host_url.rstrip('/')}/default-profile.jpg"
            )

            profiles.append({
                "name": user.get("name"),
                "images": [photo_url],
            })

        return jsonify({
            "logged_in_user": email,
            "matches": profiles
        }), 200


match_api = MatchAPI()
match_bp = match_api.match_bp
