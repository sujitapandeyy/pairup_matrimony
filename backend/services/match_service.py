from bson.objectid import ObjectId
from datetime import datetime

class MatchService:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.swipes = db["swipes"]
        self.notifications = db["notifications"]
        self.matches = db["matches"]

    def build_photo_url(self, request, raw_photo):
        # Return full URL for photo, or default profile if none
        base_url = request.host_url.rstrip('/')
        if raw_photo:
            if raw_photo.startswith("/uploads/"):
                return f"{base_url}{raw_photo}"
            return raw_photo
        return f"{base_url}/default-profile.jpg"

    def get_profiles(self, request, current_email):
        # Get profiles excluding self and those already liked by current user
        liked_emails = {s["target"] for s in self.swipes.find({"swiper": current_email, "liked": True})}
        liked_by_emails = {s["swiper"] for s in self.swipes.find({"target": current_email, "liked": True})}

        profiles = []
        for user in self.users.find():
            email = user.get("email")
            if email == current_email or email in liked_emails:
                continue

            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue

            photo_url = self.build_photo_url(request, user.get("photo"))
            profiles.append({
                "name": user.get("name"),
                "email": email,
                "age": detail.get("age"),
                "location": detail.get("location"),
                "profession": detail.get("profession"),
                "education": detail.get("education"),
                "bio": detail.get("caption", "No bio available."),
                "personality": detail.get("personality", []),
                "images": [photo_url],
                "is_match": email in liked_by_emails
            })
        return profiles

    def swipe(self, swiper, target, liked):
        # Record swipe (like or dislike)
        self.swipes.update_one(
            {"swiper": swiper, "target": target},
            {"$set": {"liked": liked, "timestamp": datetime.utcnow()}},
            upsert=True
        )

        # Remove incoming request notification because swiper responded to target's like
        self.notifications.delete_many({"to": swiper, "from": target, "type": "request"})

        if liked:
            # Check if target liked swiper too — mutual match
            reverse = self.swipes.find_one({"swiper": target, "target": swiper, "liked": True})
            match = self.matches.find_one({"users": {"$all": [swiper, target]}})

            if reverse and not match:
                # Create a new match document
                match_doc = {
                    "users": sorted([swiper, target]),
                    "timestamp": datetime.utcnow()
                }
                match_id = self.matches.insert_one(match_doc).inserted_id

                # Notify both users of the match
                for user1, user2 in [(swiper, target), (target, swiper)]:
                    self.notifications.insert_one({
                        "to": user1,
                        "from": user2,
                        "type": "match",
                        "message": f"You matched with {user2}!",
                        "read": False,
                        "timestamp": datetime.utcnow()
                    })

                return {"match": True, "match_id": str(match_id)}

            else:
                # If no mutual match, send a like request notification to target
                self.notifications.insert_one({
                    "to": target,
                    "from": swiper,
                    "type": "request",
                    "message": f"{swiper} liked your profile!",
                    "read": False,
                    "timestamp": datetime.utcnow()
                })

        else:
            # If unliked, remove match & notifications if exists
            match = self.matches.find_one({"users": {"$all": [swiper, target]}})
            if match:
                self.matches.delete_one({"_id": match["_id"]})
                self.notifications.delete_many({
                    "type": "match",
                    "$or": [
                        {"to": swiper, "from": target},
                        {"to": target, "from": swiper}
                    ]
                })

        return {"match": False}

    def get_notifications(self, email, request):
        # Get latest notifications (requests + matches) for a user
        notes = list(self.notifications.find({
            "to": email,
            "type": {"$in": ["request", "match"]}
        }).sort("timestamp", -1).limit(50))

        for n in notes:
            n["_id"] = str(n["_id"])
            n["timestamp"] = n["timestamp"].isoformat()
            sender = self.users.find_one({"email": n["from"]})
            if sender:
                n["sender_name"] = sender.get("name")
                n["sender_image"] = self.build_photo_url(request, sender.get("photo"))

                detail = self.details.find_one({"user_id": sender["_id"]})
                if detail:
                    n["sender_age"] = detail.get("age")
                    n["sender_location"] = detail.get("location")
                    n["sender_profession"] = detail.get("profession")
                    n["sender_education"] = detail.get("education")
                    n["sender_personality"] = detail.get("personality", [])
                    n["sender_caption"] = detail.get("caption", "")
        return notes

    def mark_read(self, notification_id):
        # Mark a notification as read
        return self.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )

    def ignore(self, notification_id):
        # Ignore a request notification
        notification = self.notifications.find_one({"_id": ObjectId(notification_id)})
        if not notification:
            return False

        self.notifications.delete_one({"_id": ObjectId(notification_id)})

        if notification["type"] == "request":
            # Mark swipe as disliked to avoid re-requests
            self.swipes.update_one(
                {"swiper": notification["from"], "target": notification["to"]},
                {"$set": {"liked": False, "timestamp": datetime.utcnow()}},
                upsert=True
            )
        return True

    def get_mutual_matches(self, email, request):
        # Get all mutual matched profiles for the user
        matched_docs = self.matches.find({"users": email})
        matched_emails = [u for m in matched_docs for u in m["users"] if u != email]

        profiles = []
        for user in self.users.find({"email": {"$in": matched_emails}}):
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue
            photo_url = self.build_photo_url(request, user.get("photo"))
            profiles.append({
                "name": user.get("name"),
                "images": [photo_url]
            })
        return profiles
