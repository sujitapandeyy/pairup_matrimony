from math import radians, sin, cos, sqrt, atan2
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class MatchAlgorithm:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.interests = db["user_interests"]
        self.swipes = db["swipes"]

    def get_profiles(self, request, current_email):
        user = self.users.find_one({"email": current_email})
        if not user:
            return {"preferred_gender": None, "profiles": [], "logged_in_user": None, "user_interest": None}

        user_detail = self.details.find_one({"user_id": user["_id"]}) or \
                      self.details.find_one({"user_id": str(user["_id"])})
        user_interest = self.interests.find_one({"user_id": user["_id"]}) or \
                        self.interests.find_one({"user_id": str(user["_id"])})

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
            "images": [self._build_photo_url(request, user.get("photo"))] if user.get("photo") else [self._build_photo_url(request, None)]
        }

        partner_gender_pref = user_interest.get("looking_for", {}).get("gender", "any").lower()

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

            candidate_interest = self.interests.find_one({"user_id": candidate["_id"]}) or \
                                 self.interests.find_one({"user_id": str(candidate["_id"])})

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
                user_detail, user_interest,
                detail, candidate_interest,
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
                "interest": candidate_interest,
                "compatibility_score": compatibility_score
            })

        profiles.sort(key=lambda x: -(x["compatibility_score"] or 0))

        return {
            "preferred_gender": partner_gender_pref,
            "profiles": profiles,
            "logged_in_user": logged_in_user,
            "user_interest": user_interest
        }

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
        text1 = " ".join(traits1)
        text2 = " ".join(traits2)
        vectorizer = CountVectorizer().fit_transform([text1, text2])
        vectors = vectorizer.toarray()
        cos_sim = cosine_similarity([vectors[0]], [vectors[1]])[0][0]
        return cos_sim

    def _calculate_compatibility(self, user_detail, user_interest, candidate_detail, candidate_interest, distance_km):
        score = 0
        total_weight = 0

        age = candidate_detail.get("age")
        preferred_age = user_interest.get("looking_for", {}).get("age_group", "")
        if age and preferred_age:
            try:
                min_age, max_age = map(int, preferred_age.split('-'))
                if min_age <= age <= max_age:
                    score += 10
            except:
                pass
        total_weight += 10

        if user_interest.get("looking_for", {}).get("religion") == candidate_detail.get("religion"):
            score += 10
        total_weight += 10

        if user_interest.get("looking_for", {}).get("marital_status") == candidate_detail.get("marital_status"):
            score += 5
        total_weight += 5

        if user_interest.get("looking_for", {}).get("education_level") == candidate_detail.get("education"):
            score += 10
        total_weight += 10

        if user_interest.get("looking_for", {}).get("profession") == candidate_detail.get("profession"):
            score += 5
        total_weight += 5

        if distance_km is not None:
            if distance_km < 10:
                score += 10
            elif distance_km < 50:
                score += 5
        total_weight += 10

        user_traits = user_detail.get("personality", [])
        candidate_traits = candidate_detail.get("personality", [])
        score += self._calculate_trait_similarity(user_traits, candidate_traits) * 30
        total_weight += 30

        user_hobbies = set(user_interest.get("looking_for", {}).get("hobbies", []))
        candidate_hobbies = set(candidate_interest.get("looking_for", {}).get("hobbies", [])) if candidate_interest else set()
        if user_hobbies and candidate_hobbies:
            overlap = len(user_hobbies & candidate_hobbies)
            max_len = max(len(user_hobbies), 1)
            score += (overlap / max_len) * 20
        total_weight += 20

        return round((score / total_weight) * 100, 2)
