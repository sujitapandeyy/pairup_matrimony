from bson.objectid import ObjectId
from datetime import datetime
import json
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

    
    def _parse_preferences(self, preference_value):
        """Parse preferences into a set - handles lists, strings, and comma-separated values"""
        if not preference_value:
            return set()
        if isinstance(preference_value, list):
            return {str(item).strip().lower() for item in preference_value}
        if isinstance(preference_value, str):
            if "," in preference_value:
                return {item.strip().lower() for item in preference_value.split(",")}
            return {preference_value.strip().lower()}
        return set()

    def _apply_hard_filters(self, user_prefs, candidate_detail, candidate_prefs=None):
       
        preferred_genders = self._parse_preferences(user_prefs.get("gender", "any"))
        candidate_gender = str(candidate_detail.get("gender", "")).strip().lower()
        
        if preferred_genders and "any" not in preferred_genders:
            if not candidate_gender or candidate_gender not in preferred_genders:
                return False, f"Gender mismatch: user prefers {preferred_genders}, candidate is {candidate_gender}"
        
        user_caste_prefs = self._parse_preferences(user_prefs.get("caste", []))
        candidate_caste = str(candidate_detail.get("caste", "")).strip().lower()
        
        all_castes = {"brahmin", "chhetri", "thakuri", "newar", "tamang", "magar", "rai", 
                      "limbu", "sherpa", "gurung", "dalit", "tharu", "madhesi", "muslim"}
        
        user_selected_all_castes = len(user_caste_prefs) >= len(all_castes)
        
        if user_caste_prefs and not user_selected_all_castes and "any" not in user_caste_prefs:
            if not candidate_caste or candidate_caste not in user_caste_prefs:
                return False, f"Caste mismatch: user prefers {user_caste_prefs}, candidate is {candidate_caste}"
        
        # 3. AGE FILTER
        pref_age_val = user_prefs.get("age_group") or user_prefs.get("age") or user_prefs.get("preferred_age") or user_prefs.get("age_from")
        cand_age_raw = candidate_detail.get("age")
        
        if pref_age_val and cand_age_raw:
            try:
                cand_age = int(float(str(cand_age_raw).strip()))
                
                clean_str = str(pref_age_val).replace(" ", "")
                
                if "-" in clean_str:
                    parts = clean_str.split("-")
                    min_age = int(parts[0])
                    max_age = int(parts[1])
                elif user_prefs.get("age_from") and user_prefs.get("age_to"):
                    min_age = int(user_prefs.get("age_from"))
                    max_age = int(user_prefs.get("age_to"))
                else:
                    min_age = max_age = int(clean_str)
                
                if not (min_age <= cand_age <= max_age):
                    return False, f"Age mismatch: user prefers {min_age}-{max_age}, candidate is {cand_age}"
            except Exception as e:
                pass
        
        return True, "Passed all hard filters"


    def get_sent_requests(self, email, request):
        liked_swipes = self.swipes.find({"swiper": email, "liked": True})
        sent_request_emails = [s["target"] for s in liked_swipes]

        matched_docs = self.matches.find({"users": email})
        matched_emails = {u for m in matched_docs for u in m["users"] if u != email}
        
        all_target_emails = set(sent_request_emails)

        profiles = []
        for user in self.users.find({"email": {"$in": list(all_target_emails)}}):
            target_email = user.get("email")
            
            status = 'pending'
            if target_email in matched_emails:
                status = 'accepted'
            
            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue
                
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
                "status": status,
                "created_at": created_at,
            })

        return profiles

    def get_profiles(self, request, current_email):
        """
        Get profiles with HARD FILTERING applied first (like MatchAlgorithm)
        """
        # Get current user's data
        current_user = self.users.find_one({"email": current_email})
        if not current_user:
            return []
        
        current_detail = self.details.find_one({"user_id": current_user["_id"]})
        if not current_detail:
            return []
        
        current_interests = self.interests.find_one({"user_id": current_user["_id"]}) or {}
        user_prefs = current_interests.get("looking_for", {}) or {}
        
        # Get users already swiped on
        liked_emails = {s["target"] for s in self.swipes.find({"swiper": current_email, "liked": True})}
        liked_by_emails = {s["swiper"] for s in self.swipes.find({"target": current_email, "liked": True})}

        profiles = []
        filtered_out_count = 0
        
        for user in self.users.find():
            email = user.get("email")
            
            # Skip self and already swiped users
            if email == current_email or email in liked_emails:
                continue

            detail = self.details.find_one({"user_id": user["_id"]})
            if not detail:
                continue

            # HARD FILTERS FIRST
            passed, reason = self._apply_hard_filters(user_prefs, detail)
            
            if not passed:
                filtered_out_count += 1
                print(f"FILTERED OUT: {user.get('name')} ({email}) - {reason}")
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
        
        print(f"\n=== FILTERING SUMMARY ===")
        print(f"Total candidates considered: {filtered_out_count + len(profiles)}")
        print(f"Filtered out: {filtered_out_count}")
        print(f"Passed filters: {len(profiles)}")
        print(f"=========================\n")
        
        return profiles

    def swipe(self, swiper, target, liked):
        self.swipes.update_one(
            {"swiper": swiper, "target": target},
            {"$set": {"liked": liked, "timestamp": datetime.now()}},
            upsert=True
        )

        self.notifications.delete_many({"to": swiper, "from": target, "type": "request"})

        if liked:
            reverse = self.swipes.find_one({"swiper": target, "target": swiper, "liked": True})
            match = self.matches.find_one({"users": {"$all": [swiper, target]}})

            if reverse and not match:
                match_doc = {"users": sorted([swiper, target]), "timestamp": datetime.now()}
                match_id = self.matches.insert_one(match_doc).inserted_id

                self.notifications.delete_many({
                    "type": "request",
                    "$or": [
                        {"to": swiper, "from": target},
                        {"to": target, "from": swiper}
                    ]
                })

                self.notifications.insert_one({
                    "to": swiper,
                    "from": target,
                    "type": "request_accepted",
                    "message": f"{target} accepted your request",
                    "read": False,
                    "timestamp": datetime.now()
                })

                self.notifications.insert_one({
                    "to": target,
                    "from": swiper,
                    "type": "match",
                    "message": f"You matched with {swiper}!",
                    "read": False,
                    "timestamp": datetime.now()
                })

                return {"match": True}
            
            elif not reverse:
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
                        "timestamp": datetime.now()
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
            "type": {"$in": ["request", "match", "request_accepted"]}
        }).sort("timestamp", -1).limit(50))

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
                        sender_interests = match_algo._get_document(self.interests, sender["_id"]) or {}
                        sender_prefs = sender_interests.get("looking_for", {})
                        sender_location = match_algo._get_location(sender_detail)
                        distance_km = 0
                        if current_location and sender_location:
                            try:
                                distance_km = match_algo._haversine( 
                                    current_location["lat"], current_location["lng"],
                                    sender_location["lat"], sender_location["lng"]
                                )
                            except AttributeError:
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
                {"$set": {"liked": False, "timestamp": datetime.now()}},
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

    def _get_document(self, collection, user_id):
        doc = collection.find_one({"user_id": user_id})
        if doc:
            return doc
        try:
            doc = collection.find_one({"user_id": str(user_id)})
            return doc
        except:
            return None

    def _get_location(self, detail):
        if not detail:
            return None
        loc = detail.get("location")
        if isinstance(loc, dict):
            lat, lng = loc.get("lat"), loc.get("lng")
        else:
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
        if not isinstance(loc1, dict) or not isinstance(loc2, dict):
            return None
        lat1, lon1 = loc1.get("lat"), loc1.get("lng")
        lat2, lon2 = loc2.get("lat"), loc2.get("lng")
        if None in (lat1, lon1, lat2, lon2):
            return None
        R = 6371
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def safe_int_age(self, age_value):
        try:
            return int(age_value) if age_value else 0
        except (ValueError, TypeError):
            return 0

    def process_candidate_with_compatibility(self, request, candidate, user_interests, user_location, user_prefs, liked_patterns=None):

        detail = self.details.find_one({"user_id": candidate["_id"]})
        if not detail:
            return None

        #  APPLY HARD FILTERS FIRST
        passed, reason = self._apply_hard_filters(user_prefs, detail)
        if not passed:
            print(f"FILTERED: {candidate.get('name')} - {reason}")
            return None

        candidate_location = self._get_location(detail)
        if not candidate_location:
            return None

        distance = self._calculate_distance_km(user_location, candidate_location)
        if distance is None:
            return None

        # Calculate content-based similarity 
        def create_profile_text(d, prefs):
            return " ".join([
                str(d.get("gender", "")).lower(),
                str(d.get("caste", "")).lower(),
                str(d.get("religion", "")).lower(),
                " ".join(h.lower() for h in d.get("hobbies", [])),
                str(d.get("profession", "")).lower(),
                str(d.get("education", "")).lower(),
                str(d.get("location", "")).lower()
            ]).strip()

        candidate_prefs = self._get_document(self.interests, candidate["_id"]) or {}
        candidate_looking_for = candidate_prefs.get("looking_for", {}) or {}
        
        user_detail_text = create_profile_text(detail, user_prefs)
        
        if liked_patterns:
            candidate_text = liked_patterns
        else:
            candidate_text = create_profile_text(detail, candidate_looking_for)

        user_vec = self._text_to_vector(user_detail_text)
        candidate_vec = self._text_to_vector(candidate_text)
        
        all_words = set(user_vec.keys()).union(set(candidate_vec.keys()))
        vec1 = [user_vec.get(word, 0) for word in all_words]
        vec2 = [candidate_vec.get(word, 0) for word in all_words]
        
        similarity = self._cosine_similarity(vec1, vec2)
        compatibility_score = round(min(max(similarity * 100, 0), 100), 0)

        return {
            "id": str(candidate["_id"]),
            "name": candidate.get("name"),
            "email": candidate.get("email"),
            "age": self.safe_int_age(detail.get("age")),
            "gender": str(detail.get("gender", "")).strip().lower(),
            "caste": str(detail.get("caste", "")).strip().lower(),
            "location": detail.get("location"),
            "distance_km": round(distance, 2),
            "images": [self.build_photo_url(request, candidate.get("photo"))],
            "profession": detail.get("profession"),
            "education": detail.get("education"),
            "hobbies": detail.get("hobbies", []),
            "compatibility_score": compatibility_score
        }

    def get_people_near_you(self, email, request):
        current_user = self.users.find_one({"email": email})
        if not current_user:
            return {"candidates": [], "message": "Current user not found"}

        current_detail = self.details.find_one({"user_id": current_user["_id"]})
        if not current_detail:
            return {"candidates": [], "message": "Current user details not found"}

        user_location = self._get_location(current_detail)
        if not user_location:
            return {"candidates": [], "message": "Current user location not found"}

        user_interests = self.interests.find_one({"user_id": current_user["_id"]}) or {}
        user_prefs = user_interests.get("looking_for", {}) or {}

        excluded_emails = set()
        for swipe in self.swipes.find({"swiper": email}):
            excluded_emails.add(swipe["target"])
        for swipe in self.swipes.find({"target": email, "liked": True}):
            excluded_emails.add(swipe["swiper"])

        candidates = []
        filtered_count = 0
        
        for candidate in self.users.find({"email": {"$ne": email, "$nin": list(excluded_emails)}}):
            profile = self.process_candidate_with_compatibility(
                request, candidate, user_interests, user_location, user_prefs
            )
            if profile:
                candidates.append(profile)
            else:
                filtered_count += 1

        # Sort by distance (nearby first)
        candidates = sorted(candidates, key=lambda x: x["distance_km"])[:4]
        
        print(f"Near You: {len(candidates)} shown, {filtered_count} filtered out")
        
        return {
            "candidates": candidates,
            "message": f"{len(candidates)} nearby candidates found matching your preferences"
        }

    def get_recommended_users(self, email, request):
        current_user = self.users.find_one({"email": email})
        if not current_user:
            return []
            
        current_detail = self.details.find_one({"user_id": current_user["_id"]})
        if not current_detail:
            return []
        
        current_interests = self._get_document(self.interests, current_user["_id"]) or {}
        user_location = self._get_location(current_detail)
        user_preferences = current_interests.get("looking_for", {}) or {}
        
        # Get swiped users
        all_swiped_emails = [
            entry["target"] for entry in self.swipes.find(
                {"swiper": email}, 
                {"target": 1, "_id": 0}
            )
        ]
        
        current_user_likes = set([
            entry["target"] for entry in self.swipes.find(
                {"swiper": email, "liked": True},
                {"target": 1, "_id": 0}
            )
        ])
        
        if not current_user_likes:
            return []
        
        # Find similar users
        pipeline = [
            {
                "$match": {
                    "target": {"$in": list(current_user_likes)},
                    "liked": True,
                    "swiper": {"$ne": email}
                }
            },
            {
                "$group": {
                    "_id": "$swiper",
                    "common_likes": {"$sum": 1}
                }
            },
            {
                "$sort": {"common_likes": -1}
            }
        ]
        
        similar_users = list(self.swipes.aggregate(pipeline))
        
        if not similar_users:
            return []
        
        similar_users_map = {user["_id"]: user["common_likes"] for user in similar_users}
        
        # Get recommendations
        recommendation_pipeline = [
            {
                "$match": {
                    "swiper": {"$in": list(similar_users_map.keys())},
                    "liked": True,
                    "target": {"$nin": all_swiped_emails + [email]}
                }
            },
            {
                "$group": {
                    "_id": "$target",
                    "recommenders": {"$addToSet": "$swiper"}
                }
            }
        ]
        
        recommendations = list(self.swipes.aggregate(recommendation_pipeline))
        
        if not recommendations:
            return []
        
        recommendation_scores = {}
        for rec in recommendations:
            target_email = rec["_id"]
            score = sum(similar_users_map.get(recommender, 0) for recommender in rec["recommenders"])
            recommendation_scores[target_email] = score
        
        sorted_recommendations = sorted(
            recommendation_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        candidates = []
        filtered_count = 0
        
        for recommended_email, cf_score in sorted_recommendations[:20]:
            candidate_user = self.users.find_one({"email": recommended_email})
            if not candidate_user:
                continue
            
            #  APPLY HARD FILTERS
            candidate_detail = self.details.find_one({"user_id": candidate_user["_id"]})
            if not candidate_detail:
                continue
            
            passed, reason = self._apply_hard_filters(user_preferences, candidate_detail)
            
            if not passed:
                filtered_count += 1
                print(f"CF Recommendation filtered: {candidate_user.get('name')} - {reason}")
                continue
            
            # Process candidate
            profile = self.process_candidate_with_compatibility(
                request, candidate_user, current_interests, user_location, user_preferences
            )
            
            if profile:
                profile["cf_score"] = cf_score
                profile["final_score"] = (profile["compatibility_score"] * 0.5) + (cf_score * 10)
                candidates.append(profile)
            
            if len(candidates) >= 10:
                break
        
        candidates = sorted(candidates, key=lambda x: x["final_score"], reverse=True)[:4]
        
        print(f"CF Recommendations: {len(candidates)} shown, {filtered_count} filtered out")
        
        return candidates