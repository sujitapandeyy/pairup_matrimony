from bson.objectid import ObjectId
from datetime import datetime

from math import radians, sin, cos, sqrt, atan2

class   MatchService:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.swipes = db["swipes"]
        self.notifications = db["notifications"]
        self.matches = db["matches"]
    def _cosine_similarity(self, vec1, vec2):
        dot_product = sum(a*b for a,b in zip(vec1, vec2))
        magnitude1 = sqrt(sum(a**2 for a in vec1))
        magnitude2 = sqrt(sum(b**2 for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0
        return dot_product / (magnitude1 * magnitude2)

    def _text_to_vector(self, text):
        words = text.lower().split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        return word_counts

    def build_photo_url(self, request, raw_photo):
        base_url = request.host_url.rstrip('/')
        if raw_photo:
            if raw_photo.startswith("/uploads/"):
                return f"{base_url}{raw_photo}"
            return raw_photo
        return f"{base_url}/default-profile.jpg"

    def get_sent_requests(self, email, request):
        liked = self.swipes.find({"swiper": email, "liked": True})
        liked_emails = [s["target"] for s in liked]

        reverse_likes = self.swipes.find({"target": email, "liked": True})
        reverse_emails = [s["swiper"] for s in reverse_likes]

        pending_requests = set(liked_emails) - set(reverse_emails)

        profiles = []
        for user in self.users.find({"email": {"$in": list(pending_requests)}}):
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue
            photo_url = self.build_photo_url(request, user.get("photo"))
            profiles.append({
                "id": str(user["_id"]),
                "name": user.get("name"),
                "email": user.get("email"),
                "age": detail.get("age"),
                "location": detail.get("location"),
                "photos": [photo_url],
            })

        return profiles

    def get_profiles(self, request, current_email):
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
                "id": str(user["_id"]),  
                "name": user.get("name"),
                "email": email,
                "age": detail.get("age"),
                "location": detail.get("location"),
                "profession": detail.get("profession"),
                "education": detail.get("education"),
                "bio": detail.get("caption", "No bio available."),
                "hobbies": detail.get("hobbies", []),
                "images": [photo_url],
                "is_match": email in liked_by_emails
            })
        return profiles


    def swipe(self, swiper, target, liked):
        self.swipes.update_one(
            {"swiper": swiper, "target": target},
            {"$set": {"liked": liked, "timestamp": datetime.utcnow()}},
            upsert=True
        )

        self.notifications.delete_many({"to": swiper, "from": target, "type": "request"})

        if liked:
            reverse = self.swipes.find_one({"swiper": target, "target": swiper, "liked": True})
            match = self.matches.find_one({"users": {"$all": [swiper, target]}})

            if reverse and not match:
                match_doc = {
                    "users": sorted([swiper, target]),
                    "timestamp": datetime.utcnow()
                }
                match_id = self.matches.insert_one(match_doc).inserted_id

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
                self.notifications.insert_one({
                    "to": target,
                    "from": swiper,
                    "type": "request",
                    "message": f"{swiper} liked your profile!",
                    "read": False,
                    "timestamp": datetime.utcnow()
                })

        else:
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
                n["sender_id"] = str(sender["_id"])  
                n["sender_image"] = self.build_photo_url(request, sender.get("photo"))

                detail = self.details.find_one({"user_id": sender["_id"]})
                if detail:
                    n["sender_age"] = detail.get("age")
                    n["sender_location"] = detail.get("location")
                    n["sender_profession"] = detail.get("profession")
                    n["sender_education"] = detail.get("education")
                    n["sender_hobbies"] = detail.get("hobbies", [])
                    n["sender_caption"] = detail.get("caption", "")
                    n["compatibility_score"] = detail.get("compatibility_score", "0")
        return notes

    def mark_read(self, notification_id):
        return self.notifications.update_one(
            {"_id": ObjectId(notification_id)},
            {"$set": {"read": True}}
        )

    def ignore(self, notification_id):
        notification = self.notifications.find_one({"_id": ObjectId(notification_id)})
        if not notification:
            return False

        self.notifications.delete_one({"_id": ObjectId(notification_id)})

        if notification["type"] == "request":
            self.swipes.update_one(
                {"swiper": notification["from"], "target": notification["to"]},
                {"$set": {"liked": False, "timestamp": datetime.utcnow()}},
                upsert=True
            )
        return True

    def get_mutual_matches(self, email, request):
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
                "email": user.get("email"),
                "images": [photo_url],
                # "location": detail.get("location"),
            })
        return profiles

    def cancel_sent_request(self, swiper_email, target_email):
        swipe_result = self.swipes.delete_one({
            "swiper": swiper_email,
            "target": target_email,
            "liked": True
        })

        self.notifications.delete_many({
            "from": swiper_email,
            "to": target_email,
            "type": "request"
        })

        return swipe_result.deleted_count > 0
    


    def get_similar_to_liked_users(self, email, request):
        current_user = self.users.find_one({"email": email})
        if not current_user:
            return []
        
        current_detail = self.details.find_one({"user_id": current_user["_id"]})
        if not current_detail:
            return []

        swiped_users = list(self.swipes.find({"swiper": email, "liked": True}))
        swiped_emails = [entry["target"] for entry in swiped_users]

        if not swiped_emails:
            return []

        liked_users = list(self.users.find({"email": {"$in": swiped_emails}}))
        liked_user_ids = [user["_id"] for user in liked_users]
        liked_details = list(self.details.find({"user_id": {"$in": liked_user_ids}}))

        if not liked_details:
            return []

        def get_most_common(vectors, key):
            values = [v.get(key, "").lower() for v in vectors if v.get(key)]
            if not values:
                return None
            return max(set(values), key=values.count)

        preferred_gender = get_most_common(liked_details, "gender")
        preferred_caste = get_most_common(liked_details, "caste")

        def create_profile_text(detail):
            return " ".join([
                detail.get("gender", "").lower(),
                detail.get("caste", "").lower(),
                detail.get("religion", "").lower(),
                " ".join(h.lower() for h in detail.get("hobbies", [])),
                str(detail.get("age", 0)),
                detail.get("profession", "").lower(),
                detail.get("education", "").lower()
            ])

        liked_text = " ".join(create_profile_text(d) for d in liked_details)

        candidate_users = list(self.users.find({
            "email": {"$nin": swiped_emails + [email]}
        }))

        candidates = []
        for user in candidate_users:
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue

            # Rule-based filtering
            candidate_gender = detail.get("gender", "").lower()
            candidate_caste = detail.get("caste", "").lower()

            if preferred_gender and candidate_gender != preferred_gender:
                continue

            if preferred_caste and candidate_caste != preferred_caste:
                continue

            candidate_text = create_profile_text(detail)

            liked_vec = self._text_to_vector(liked_text)
            candidate_vec = self._text_to_vector(candidate_text)
            
            all_words = set(liked_vec.keys()).union(set(candidate_vec.keys()))
            vec1 = [liked_vec.get(word, 0) for word in all_words]
            vec2 = [candidate_vec.get(word, 0) for word in all_words]
            
            similarity = self._cosine_similarity(vec1, vec2)

            if similarity > 0.3:
                photo = user.get("photo")
                candidates.append({
                    "id": str(user["_id"]),
                    "name": user.get("name", "Unknown"),
                    "email": user.get("email", ""),
                    "images": [self.build_photo_url(request, photo)] if photo else [],
                    "location": detail.get("location", ""),
                    "age": detail.get("age", ""),
                    "profession": detail.get("profession", ""),
                    "education": detail.get("education", ""),
                    "similarity_score": round(similarity, 3)
                })

        return sorted(candidates, key=lambda x: x["similarity_score"], reverse=True)[:5]