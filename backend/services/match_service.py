from bson.objectid import ObjectId
from datetime import datetime
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
class MatchService:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.swipes = db["swipes"]
        self.notifications = db["notifications"]
        self.matches = db["matches"]

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
        # Step 1: Get users the logged-in user has liked
        swiped_users = list(self.swipes.find({"swiper": email}))
        swiped_emails = [entry["target"] for entry in swiped_users]


        if not swiped_emails:
            return []

        # Step 2: Get their details
        liked_details = list(self.details.find({
            "user_id": {"$in": [self.users.find_one({"email": e})["_id"] for e in swiped_emails if self.users.find_one({"email": e})]}
        }))

        # Step 3: Gather preference features
        def feature_vector(detail):
            return {
                "user_id": detail["user_id"],
                "gender": detail.get("gender", ""),
                "religion": detail.get("religion", ""),
                "hobbies": " ".join(detail.get("hobbies", [])),
                "age": str(detail.get("age", "")),
            }

        liked_vectors = [feature_vector(d) for d in liked_details]

        # Create synthetic profile representing the liked user's preferences
        combined = {
            "gender": " ".join([v["gender"] for v in liked_vectors]),
            "religion": " ".join([v["religion"] for v in liked_vectors]),
            "hobbies": " ".join([v["hobbies"] for v in liked_vectors]),
            "age": " ".join([v["age"] for v in liked_vectors])
        }

       # Get dominant gender from liked profiles
        preferred_gender = liked_vectors[0]["gender"] if liked_vectors else ""

        # Step 4: Get all other users excluding self and previously liked
        candidate_users = list(self.users.find({
            "email": {"$nin": swiped_emails + [email]}
        }))

        candidates = []
        for user in candidate_users:
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue

            # Filter by matching gender
            if detail.get("gender", "") != preferred_gender:
                continue

            vector = feature_vector(detail)
            vector["name"] = user.get("name")
            vector["email"] = user.get("email")
            vector["images"] = [self.build_photo_url(request, user.get("photo"))]
            vector["location"] = detail.get("location")
            vector["profession"] = detail.get("profession")
            vector["education"] = detail.get("education")
            candidates.append(vector)


        # Step 5: Vectorize and compare using cosine similarity
        corpus = [
            f"{combined['gender']} {combined['religion']} {combined['hobbies']} {combined['age']}"
        ] + [
            f"{c['gender']} {c['religion']} {c['hobbies']} {c['age']}" for c in candidates
        ]

        vectorizer = CountVectorizer().fit_transform(corpus)
        similarity = cosine_similarity(vectorizer)

        results = []
        for idx, score in enumerate(similarity[0][1:]):
            if score > 0:  # You may tweak the threshold
                c = candidates[idx]
                c["similarity_score"] = round(score, 3)
                results.append(c)

        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:5]