from bson.objectid import ObjectId
from datetime import datetime
import json # Added import for json parsing in utility methods

from math import radians, sin, cos, sqrt, atan2

class MatchService:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.interests = db["user_interests"] 
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
        # 1. Find all users the current user (email) has swiped right on
        liked_swipes = self.swipes.find({"swiper": email, "liked": True})
        sent_request_emails = [s["target"] for s in liked_swipes]

        # 2. Find all matches the current user is a part of
        matched_docs = self.matches.find({"users": email})
        matched_emails = {u for m in matched_docs for u in m["users"] if u != email}
        
        # Combine all unique emails that the current user has sent a request to.
        all_target_emails = set(sent_request_emails)

        profiles = []
        for user in self.users.find({"email": {"$in": list(all_target_emails)}}):
            target_email = user.get("email")
            
            # Determine status: check if the target is in the matched_emails set
            status = 'pending'
            if target_email in matched_emails:
                status = 'accepted'
            
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue
                
            # Get the timestamp of the original swipe for the 'created_at' field
            swipe_doc = self.swipes.find_one({"swiper": email, "target": target_email, "liked": True})
            created_at = swipe_doc.get("timestamp").isoformat() if swipe_doc and swipe_doc.get("timestamp") else None

            photo_url = self.build_photo_url(request, user.get("photo"))
            profiles.append({
                "id": str(user["_id"]),
                "name": user.get("name"),
                "email": target_email,
                "age": detail.get("age"),
                "location": detail.get("location"),
                "photos": [photo_url],
                "status": status, # <-- ADDED status
                "created_at": created_at, # <-- ADDED timestamp
                # Note: Compatibility score is not calculated here due to complexity, 
                # but the front-end can infer a high score (e.g., 75-100) for 'accepted' statuses.
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
        # Update swipe record
        self.swipes.update_one(
            {"swiper": swiper, "target": target},
            {"$set": {"liked": liked, "timestamp": datetime.utcnow()}},
            upsert=True
        )

        # Remove any old request notifications from the target back to swiper
        self.notifications.delete_many({"to": swiper, "from": target, "type": "request"})

        if liked:
            # Check if target already liked swiper (mutual like) BEFORE sending notification
            reverse = self.swipes.find_one({"swiper": target, "target": swiper, "liked": True})
            match = self.matches.find_one({"users": {"$all": [swiper, target]}})

            if reverse and not match:
                # IT'S A MUTUAL MATCH - Create the match directly, no request notification needed
                match_doc = {"users": sorted([swiper, target]), "timestamp": datetime.utcnow()}
                match_id = self.matches.insert_one(match_doc).inserted_id

                # Delete any existing request notifications between these users
                self.notifications.delete_many({
                    "type": "request",
                    "$or": [
                        {"to": swiper, "from": target},
                        {"to": target, "from": swiper}
                    ]
                })

                # Notify swiper that target accepted (swiper gets "request_accepted")
                self.notifications.insert_one({
                    "to": swiper,
                    "from": target,
                    "type": "request_accepted",
                    "message": f"{target} accepted your request",
                    "read": False,
                    "timestamp": datetime.utcnow()
                })

                # Notify target about the match (target gets "match")
                self.notifications.insert_one({
                    "to": target,
                    "from": swiper,
                    "type": "match",
                    "message": f"You matched with {swiper}!",
                    "read": False,
                    "timestamp": datetime.utcnow()
                })

                return {"match": True}
            
            elif not reverse:
                # NO MUTUAL MATCH YET - Send a normal request notification to target
                # Only send if there's no existing request notification
                existing_request = self.notifications.find_one({
                    "to": target,
                    "from": swiper,
                    "type": "request"
                })
                
                if not existing_request:
                    self.notifications.insert_one({
                        "to": target,
                        "from": swiper,
                        "type": "request",
                        "message": f"{swiper} sent you a request",
                        "read": False,
                        "timestamp": datetime.utcnow()
                    })

        else:
            # If user unliked, remove any existing match
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
        """Fetch all relevant notifications for the current user"""
        notes = list(self.notifications.find({
            "to": email,
            "type": {"$in": ["request", "match", "request_accepted"]}
        }).sort("timestamp", -1).limit(50))

        # This part requires an actual MatchAlgorithm service or definition of _haversine etc.
        # Assuming MatchAlgorithm is defined in the execution context for this method to run.
        try:
            from services.match_algorithm import MatchAlgorithm
            match_algo = MatchAlgorithm(self.users.database)
        except ImportError:
            class DummyMatchAlgorithm:
                def __init__(self, db): pass
                def _get_document(self, col, user_id): return None
                def _get_location(self, detail): return None
                def _haversine(self, lat1, lng1, lat2, lng2): return 0
                def _calculate_compatibility(self, *args): return {"total_score": 50}
            match_algo = DummyMatchAlgorithm(self.users.database)


        current_user = self.users.find_one({"email": email})
        if not current_user:
            return notes
        
        current_detail = match_algo._get_document(self.details, current_user["_id"])
        current_interests = match_algo._get_document(self.interests, current_user["_id"]) or {}
        current_location = match_algo._get_location(current_detail)

        for n in notes:
            n["_id"] = str(n["_id"])
            n["timestamp"] = n["timestamp"].isoformat()
            n["created_at"] = n["timestamp"]

            sender = self.users.find_one({"email": n["from"]})
            if sender:
                n["sender_name"] = sender.get("name")
                n["sender_id"] = str(sender["_id"])
                n["sender_image"] = self.build_photo_url(request, sender.get("photo"))

                sender_detail = match_algo._get_document(self.details, sender["_id"])
                if sender_detail:
                    n["sender_age"] = sender_detail.get("age")
                    n["sender_location"] = sender_detail.get("location")
                    n["sender_profession"] = sender_detail.get("profession")
                    n["sender_education"] = sender_detail.get("education")
                    n["sender_hobbies"] = sender_detail.get("hobbies", [])
                    n["sender_caption"] = sender_detail.get("caption", "")

                    if n["type"] == "request":
                        # calculate compatibility
                        sender_interests = match_algo._get_document(self.interests, sender["_id"]) or {}
                        sender_prefs = sender_interests.get("looking_for", {})
                        sender_location = match_algo._get_location(sender_detail)
                        distance_km = 0
                        if current_location and sender_location:
                            # Use method defined in MatchAlgorithm service (or locally if available)
                            try:
                                distance_km = match_algo._haversine( 
                                    current_location["lat"], current_location["lng"],
                                    sender_location["lat"], sender_location["lng"]
                                )
                            except AttributeError:
                                # Fallback if _haversine is not available in match_algo
                                pass 

                        compatibility = match_algo._calculate_compatibility(
                            current_detail,
                            current_interests,
                            sender_detail,
                            sender_prefs,
                            distance_km
                        )
                        n["compatibility_score"] = compatibility.get("total_score", 50)
                        n["score"] = n["compatibility_score"]
                    elif n["type"] == "match" or n["type"] == "request_accepted":
                        n["compatibility_score"] = 75
                        n["score"] = 75

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
                "_id": str(user["_id"]),
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
    
    def _get_document(self, collection, user_id):
        """Fetch a document from collection by ObjectId or string"""
        doc = collection.find_one({"user_id": user_id})
        if doc:
            return doc
        try:
            doc = collection.find_one({"user_id": str(user_id)})
            return doc
        except:
            return None

    def _get_swipe_data(self, current_email):
        """Return sets of emails swiped by or on the current user"""
        swiped_by_user = {s["target"] for s in self.swipes.find({"swiper": current_email})}
        swiped_on_user = {s["swiper"] for s in self.swipes.find({"target": current_email})}
        return swiped_by_user, swiped_on_user

    # NOTE: self.build_photo_url already exists, renaming the private copy to avoid confusion
    def _build_photo_url(self, request, raw_photo):
        return self.build_photo_url(request, raw_photo)

    def _get_location(self, detail):
        """Parse user location safely"""
        loc = detail.get("location")
        if isinstance(loc, dict):
            lat, lng = loc.get("lat"), loc.get("lng")
        else:
            # Try parsing JSON string
            try:
                loc = json.loads(loc)
                lat, lng = loc.get("lat"), loc.get("lng")
            except:
                lat, lng = detail.get("latitude"), detail.get("longitude")

        try:
            lat, lng = float(lat), float(lng)
            return {"lat": lat, "lng": lng}
        except:
            return None

    def _calculate_distance_km(self, loc1, loc2):
        """Haversine distance between two lat/lng dicts"""
        if not isinstance(loc1, dict) or not isinstance(loc2, dict):
            return None

        lat1, lon1 = loc1.get("lat"), loc1.get("lng")
        lat2, lon2 = loc2.get("lat"), loc2.get("lng")
        if None in (lat1, lon1, lat2, lon2):
            return None

        R = 6371  # Earth radius km
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def _process_candidate(self, request, candidate, liked_emails, liked_by_emails, user_detail, user_interests, user_location):
        """Return candidate profile dict or None if filtered"""
        email = candidate.get("email")
        if email in liked_emails or email in liked_by_emails:
            return None

        detail = self._get_document(self.details, candidate["_id"])
        if not detail:
            return None

        candidate_interests = self._get_document(self.interests, candidate["_id"]) or {}
        looking_for = candidate_interests.get("looking_for", {})

        candidate_location = self._get_location(detail)
        distance = None
        if user_location and candidate_location:
            distance = self._calculate_distance_km(user_location, candidate_location)

        # Example basic filter: gender & caste preferences
        preferred_gender = str(user_interests.get("looking_for", {}).get("gender", "")).lower()
        preferred_caste = str(user_detail.get("caste", "")).lower()

        candidate_gender = str(detail.get("gender", "")).lower()
        candidate_caste = str(detail.get("caste", "")).lower()

        if preferred_gender and candidate_gender != preferred_gender:
            return None
        if preferred_caste and candidate_caste != preferred_caste:
            return None
        if not candidate_location:
            return None

        return {
            "id": str(candidate["_id"]),
            "name": candidate.get("name"),
            "email": email,
            "age": detail.get("age"),
            "gender": candidate_gender,
            "caste": candidate_caste,
            "location": detail.get("location"),
            "distance_km": round(distance, 2) if distance else None,
            "images": [self._build_photo_url(request, candidate.get("photo"))]
        }

    # --- Main API Method ---
    def get_people_near_you(self, email, request):
        """Fetch nearest candidates with reasons for skipping"""
        current_user = self.users.find_one({"email": email})
        if not current_user:
            return {"candidates": [], "skipped": [], "message": "Current user not found"}

        current_detail = self.details.find_one({"user_id": current_user["_id"]})
        if not current_detail:
            return {"candidates": [], "skipped": [], "message": "Current user details not found"}

        user_location = self._get_location(current_detail)
        if not user_location:
            return {"candidates": [], "skipped": [], "message": "Current user location parse error"}

        user_interests = self._get_document(self.interests, current_user["_id"]) or {}
        liked_emails, liked_by_emails = self._get_swipe_data(email)

        candidates = []
        skipped = []

        for candidate in self.users.find({"email": {"$ne": email}}):
            profile = self._process_candidate(request, candidate, liked_emails, liked_by_emails,
                                             current_detail, user_interests, user_location)
            if profile:
                candidates.append(profile)
            else:
                skipped.append({
                    "email": candidate.get("email"),
                    "reason": "Filtered out due to preferences, caste/gender mismatch, or location parse error"
                })

        # Sort by nearest distance
        candidates = sorted(candidates, key=lambda x: x["distance_km"] or 9999)

        return {
            "candidates": candidates[:6],
            "skipped": skipped,
            "message": f"{len(candidates)} candidates found, {len(skipped)} skipped"
        }