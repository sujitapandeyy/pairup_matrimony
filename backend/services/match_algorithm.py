from math import radians, sin, cos, sqrt, atan2
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class MatchAlgorithm:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.hobbies = db["user_hobbies"]
        self.swipes = db["swipes"]

    def get_profiles(self, request, current_email):
        user = self.users.find_one({"email": current_email})
        if not user:
            return {"preferred_gender": None, "profiles": [], "logged_in_user": None, "user_hobbies": None}

        user_detail = self.details.find_one({"user_id": user["_id"]}) or \
                      self.details.find_one({"user_id": str(user["_id"])})
        user_hobbies = self.hobbies.find_one({"user_id": user["_id"]}) or \
                        self.hobbies.find_one({"user_id": str(user["_id"])})

        # Get hobbies from either user_hobbies or user_details
        user_hobbies_list = self._get_hobbies_list(user_hobbies, user_detail)

        logged_in_user = {
            "name": user.get("name"),
            "email": user.get("email"),
            "gender": user_detail.get("gender") if user_detail else None,
            "age": user_detail.get("age") if user_detail else None,
            "location": user_detail.get("location") if user_detail else None,
            "religion": user_detail.get("religion") if user_detail else None,
            "marital_status": user_detail.get("marital_status") if user_detail else None,
            "education": user_detail.get("education") if user_detail else None,
            "profession": user_detail.get("profession") if user_detail else None,
            "bio": user_detail.get("caption", "No bio available.") if user_detail else None,
            "personality": user_detail.get("personality", []) if user_detail else [],
            "hobbies": user_hobbies_list,
            "images": [self._build_photo_url(request, user.get("photo"))] if user.get("photo") else [self._build_photo_url(request, None)]
        }

        partner_gender_pref = (
            user_hobbies.get("looking_for", {}).get("gender", "any").lower()
            if user_hobbies else "any"
        )

        liked_emails = {s["target"] for s in self.swipes.find({"swiper": current_email, "liked": True})}
        liked_by_emails = {s["swiper"] for s in self.swipes.find({"target": current_email, "liked": True})}

        user_location = user_detail.get("location_coordinates") or {
            "lat": user_detail.get("latitude"),
            "lng": user_detail.get("longitude")
        }

        profiles = []

        for candidate in self.users.find():
            email = candidate.get("email")
            if email == current_email or email in liked_emails:
                continue

            detail = self.details.find_one({"user_id": candidate["_id"]}) or \
                     self.details.find_one({"user_id": str(candidate["_id"])})
            if not detail:
                continue

            candidate_gender = str(detail.get("gender", "")).strip().lower()
            if partner_gender_pref != "any" and candidate_gender != partner_gender_pref:
                continue

            candidate_hobbies = self.hobbies.find_one({"user_id": candidate["_id"]}) or \
                                 self.hobbies.find_one({"user_id": str(candidate["_id"])})

            # Get candidate hobbies from either hobbies collection or details
            candidate_hobbies_list = self._get_hobbies_list(candidate_hobbies, detail)

            candidate_location = detail.get("location_coordinates") or {
                "lat": detail.get("latitude"),
                "lng": detail.get("longitude")
            }

            distance = None
            if user_location and candidate_location:
                try:
                    distance = self._haversine(
                        float(user_location["lat"]), float(user_location["lng"]),
                        float(candidate_location["lat"]), float(candidate_location["lng"])
                    )
                except:
                    pass

            photo_url = self._build_photo_url(request, candidate.get("photo"))

            compatibility_score = self._calculate_compatibility(
                user_detail, user_hobbies_list,
                detail, candidate_hobbies_list,
                distance
            )

            profiles.append({
                "id": str(candidate["_id"]),
                "name": candidate.get("name"),
                "email": email,
                "age": detail.get("age"),
                "gender": detail.get("gender"),
                "religion": detail.get("religion"),
                "marital_status": detail.get("marital_status"),
                "location": detail.get("location"),
                "location_coordinates": candidate_location,
                "profession": detail.get("profession"),
                "education": detail.get("education"),
                "bio": detail.get("caption", "No bio available."),
                "personality": detail.get("personality", []),
                "images": [photo_url],
                "is_match": email in liked_by_emails,
                "distance_km": round(distance, 2) if distance else None,
                "hobbies": candidate_hobbies_list,
                "compatibility_score": compatibility_score
            })

        profiles.sort(key=lambda x: -(x["compatibility_score"] or 0))

        return {
            "preferred_gender": partner_gender_pref,
            "profiles": profiles,
            "logged_in_user": logged_in_user,
            "user_hobbies": user_hobbies_list
        }

    def _get_hobbies_list(self, hobbies_doc, details_doc):
        """Helper method to get hobbies from either hobbies collection or details"""
        if hobbies_doc:
            # First try looking_for.hobbies, then direct hobbies field
            hobbies = hobbies_doc.get("looking_for", {}).get("hobbies", [])
            if not hobbies:
                hobbies = hobbies_doc.get("hobbies", [])
            return hobbies
        elif details_doc:
            return details_doc.get("hobbies", [])
        return []

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def _build_photo_url(self, request, raw_photo):
        base_url = request.host_url.rstrip('/')
        if raw_photo:
            if raw_photo.startswith("/uploads/"):
                return f"{base_url}{raw_photo}"
            return raw_photo
        return f"{base_url}/default-profile.jpg"

    def _calculate_trait_similarity(self, traits1, traits2):
        if not traits1 or not traits2:
            return 0
        
        traits1 = [str(t).strip().lower() for t in traits1 if str(t).strip()]
        traits2 = [str(t).strip().lower() for t in traits2 if str(t).strip()]
        
        if not traits1 or not traits2:
            return 0
        
        text1 = " ".join(traits1)
        text2 = " ".join(traits2)
        
        try:
            vectorizer = CountVectorizer(
                lowercase=False,
                token_pattern=r'(?u)\b\w+\b',
                min_df=1,
                stop_words=None
            )
            
            vectorizer.fit([text1, text2])
            vectors = vectorizer.transform([text1, text2]).toarray()
            
            if vectors.shape[1] == 0:
                return 0
                
            cos_sim = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
            return cos_sim
        except Exception:
            return 0

    def _calculate_compatibility(self, user_detail, user_hobbies, candidate_detail, candidate_hobbies, distance_km):
        score = 0
        total_weight = 0

        # Age compatibility
        age = candidate_detail.get("age") if candidate_detail else None
        preferred_age = user_detail.get("preferred_age", "") if user_detail else ""
        if age and preferred_age:
            try:
                min_age, max_age = map(int, preferred_age.split('-'))
                if min_age <= age <= max_age:
                    score += 10
            except:
                pass
        total_weight += 10

        # Religion compatibility
        if user_detail and candidate_detail and user_detail.get("religion") == candidate_detail.get("religion"):
            score += 10
        total_weight += 10

        # Marital status compatibility
        if user_detail and candidate_detail and user_detail.get("marital_status") == candidate_detail.get("marital_status"):
            score += 5
        total_weight += 5

        # Education compatibility
        if user_detail and candidate_detail and user_detail.get("education") == candidate_detail.get("education"):
            score += 10
        total_weight += 10

        # Profession compatibility
        if user_detail and candidate_detail and user_detail.get("profession") == candidate_detail.get("profession"):
            score += 5
        total_weight += 5

        # Distance compatibility
        if distance_km is not None:
            if distance_km < 10:
                score += 10
            elif distance_km < 50:
                score += 5
        total_weight += 10

        # Personality traits compatibility
        user_traits = user_detail.get("personality", []) if user_detail else []
        candidate_traits = candidate_detail.get("personality", []) if candidate_detail else []
        score += self._calculate_trait_similarity(user_traits, candidate_traits) * 30
        total_weight += 30

        # Hobbies compatibility
        if user_hobbies and candidate_hobbies:
            user_hobbies_set = set(user_hobbies)
            candidate_hobbies_set = set(candidate_hobbies)
            overlap = len(user_hobbies_set & candidate_hobbies_set)
            max_len = max(len(user_hobbies_set), 1)
            score += (overlap / max_len) * 20
        total_weight += 20

        if total_weight == 0:
            return 0
        return round((score / total_weight) * 100, 2)