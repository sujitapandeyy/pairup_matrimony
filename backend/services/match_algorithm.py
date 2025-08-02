from math import radians, sin, cos, sqrt, atan2

class MatchAlgorithm:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.interests = db["user_interests"]
        self.swipes = db["swipes"]

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

    def _vectorize_features(self, user_data, candidate_data, user_interests, candidate_interests):
        

        features = {
            'religion': str(user_data.get("religion", "")) if user_data else "",
            'education': str(user_data.get("education", "")) if user_data else "",
            'profession': str(user_data.get("profession", "")) if user_data else "",
            'hobbies': " ".join(user_data.get("hobbies", [])) if user_data else "",
            'personality': " ".join(user_data.get("personality", [])) if user_data else ""
        }

        candidate_features = {
            'religion': str(candidate_data.get("religion", "")) if candidate_data else "",
            'education': str(candidate_data.get("education", "")) if candidate_data else "",
            'profession': str(candidate_data.get("profession", "")) if candidate_data else "",
            'hobbies': " ".join(candidate_data.get("hobbies", [])) if candidate_data else "",
            'personality': " ".join(candidate_data.get("personality", [])) if candidate_data else ""
        }

        user_text = " ".join(features.values())
        candidate_text = " ".join(candidate_features.values())

        user_vec = self._text_to_vector(user_text)
        candidate_vec = self._text_to_vector(candidate_text)

        all_words = set(user_vec.keys()).union(set(candidate_vec.keys()))
        vec1 = [user_vec.get(word, 0) for word in all_words]
        vec2 = [candidate_vec.get(word, 0) for word in all_words]

        return vec1, vec2, features

    def _parse_preferences(self, preference_value):
        if not preference_value:
            return set()
        
        if isinstance(preference_value, list):
            return {str(item).strip().lower() for item in preference_value}
        
        if isinstance(preference_value, str):
            if ',' in preference_value:
                return {item.strip().lower() for item in preference_value.split(',')}
            return {preference_value.strip().lower()}
        
        return set()

    def _apply_rule_based_filtering(self, user_prefs, candidate_data,interests_data):
        preferred_genders = self._parse_preferences(user_prefs.get("gender", "any"))
        candidate_gender = str(candidate_data.get("gender", "")).lower()
        
        if "any" not in preferred_genders and candidate_gender not in preferred_genders:
            return False, "Gender preference mismatch"

        user_caste_prefs = self._parse_preferences(user_prefs.get("caste", "any"))
        candidate_caste = str(candidate_data.get("caste", "")).lower()
        
        if "any" not in user_caste_prefs and candidate_caste:
            if candidate_caste not in user_caste_prefs:
                return False, f"Caste not in preferred: {user_caste_prefs}"

        return True, "Passed all filters"

    def _calculate_compatibility(self, user_detail, user_interests, candidate_detail, candidate_interests, distance_km):

        score_breakdown = {
            'total_score': 0,
            'content_similarity': {'score': 0, 'matched_features': []},
            'location': {'score': 0, 'distance_km': distance_km},
            'age': {'score': 0, 'user_age': user_detail.get("age"), 'candidate_age': candidate_detail.get("age")},
            'interests': {'score': 0, 'common_hobbies': [], 'user_hobbies': [], 'candidate_hobbies': []},
            'filter_passed': True,
            'rejection_reason': None
        }

        user_prefs = user_interests.get("looking_for", {})
        passed, reason = self._apply_rule_based_filtering(user_prefs, candidate_detail, candidate_interests)
        if not passed:
            score_breakdown['filter_passed'] = False
            score_breakdown['rejection_reason'] = reason
            return score_breakdown

        vec1, vec2, features = self._vectorize_features(user_detail, candidate_detail, user_interests, candidate_interests)
        content_score = self._cosine_similarity(vec1, vec2) * 70
        score_breakdown['content_similarity']['score'] = content_score
        score_breakdown['content_similarity']['matched_features'] = [f"{k}: {v}" for k, v in features.items() if v]

        location_score = 0
        if distance_km <= 50:
            location_score = 10
        elif distance_km <= 1000:
            location_score = 10 * (1 - (distance_km - 50) / 950)
        score_breakdown['location']['score'] = location_score

        age_score = 0
        try:
            candidate_age = candidate_detail.get("age")
            age_pref = user_prefs.get("age_group", "18-99")
            min_age, max_age = map(int, age_pref.split('-')) if '-' in age_pref else (18, 99)

            if min_age <= candidate_age <= max_age:
                age_score = 10
                score_breakdown['age']['match'] = f"Within preferred range ({min_age}-{max_age})"
            else:
                score_breakdown['age']['match'] = f"Outside preferred range ({min_age}-{max_age})"
        except Exception as e:
            score_breakdown['age']['error'] = str(e)
        score_breakdown['age']['score'] = age_score

        interest_score = 0
        user_hobbies = set(str(h).lower() for h in user_detail.get("hobbies", []))
        candidate_hobbies = set(str(h).lower() for h in candidate_detail.get("hobbies", []))
        score_breakdown['interests']['user_hobbies'] = list(user_hobbies)
        score_breakdown['interests']['candidate_hobbies'] = list(candidate_hobbies)

        if user_hobbies and candidate_hobbies:
            common = user_hobbies & candidate_hobbies
            interest_score = 10 * len(common) / len(user_hobbies)
            score_breakdown['interests']['common_hobbies'] = list(common)
            score_breakdown['interests']['match_percentage'] = f"{len(common)/len(user_hobbies)*100:.1f}%"

        score_breakdown['interests']['score'] = interest_score

        total_score = content_score + location_score + age_score + interest_score
        score_breakdown['total_score'] = round(min(100, max(0, total_score)))

        return score_breakdown


    def _get_document(self, collection, user_id):
        return collection.find_one({"user_id": user_id}) or collection.find_one({"user_id": str(user_id)})

    def _get_interests_list(self, interests_doc, details_doc):
        interests = []
        def extend_clean(data):
            if isinstance(data, list):
                interests.extend([i.strip() for i in data if i])
            elif isinstance(data, str):
                interests.append(data.strip())

        if interests_doc:
            extend_clean(interests_doc.get("interests"))
            extend_clean(interests_doc.get("hobbies"))
            extend_clean(interests_doc.get("personality"))

            looking_for = interests_doc.get("looking_for", {})
            if isinstance(looking_for, dict):
                extend_clean(looking_for.get("interests"))
                extend_clean(looking_for.get("hobbies"))
                extend_clean(looking_for.get("personality"))

        if details_doc:
            extend_clean(details_doc.get("interests"))
            extend_clean(details_doc.get("hobbies"))
            extend_clean(details_doc.get("personality"))

        return list(set(filter(None, interests)))

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def _get_location(self, user_detail):
        if not user_detail:
            return None
        if "location_coordinates" in user_detail:
            coords = user_detail["location_coordinates"]
            if isinstance(coords, dict):
                try:
                    lat = float(coords.get("lat", 0))
                    lng = float(coords.get("lng", 0))
                    if lat != 0 and lng != 0:
                        return {"lat": lat, "lng": lng}
                except (ValueError, TypeError):
                    pass
        try:
            lat = user_detail.get("latitude")
            lng = user_detail.get("longitude")
            if lat is not None and lng is not None:
                return {
                    "lat": float(lat),
                    "lng": float(lng)
                }
        except (ValueError, TypeError):
            pass
        return None

    def _build_photo_url(self, request, raw_photo):
        base_url = request.host_url.rstrip('/')
        if raw_photo:
            if raw_photo.startswith("/uploads/"):
                return f"{base_url}{raw_photo}"
            return raw_photo
        return f"{base_url}/default-profile.jpg"

    def _process_candidate(self, request, candidate, partner_gender_pref, liked_emails, liked_by_emails, user_detail, user_interests_list, user_location):
        email = candidate.get("email")
        if email in liked_emails or email in liked_by_emails:
            return None

        detail = self._get_document(self.details, candidate["_id"])
        if not detail:
            return None

        candidate_interests = self._get_document(self.interests, candidate["_id"])
        candidate_location = self._get_location(detail)

        distance = None
        if user_location and candidate_location:
            distance = self._haversine(
                user_location["lat"], user_location["lng"],
                candidate_location["lat"], candidate_location["lng"]
            )

        compatibility = self._calculate_compatibility(
        user_detail,
        self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id")),
        detail,
        candidate_interests,
        distance or 0
    )


        if not compatibility['filter_passed']:
            return None

        return {
            "id": str(candidate["_id"]),
            "name": candidate.get("name"),
            "email": email,
            "age": detail.get("age"),
            "gender": detail.get("gender"),
            "religion": detail.get("religion"),
            "caste": detail.get("caste"),
            "marital_status": detail.get("marital_status"),
            "location": detail.get("location"),
            "profession": detail.get("profession"),
            "education": detail.get("education"),
            "bio": detail.get("caption", "No bio available."),
            "personality": detail.get("personality", []),
            "hobbies": detail.get("hobbies", []),
            "images": [self._build_photo_url(request, candidate.get("photo"))],
            "is_match": email in liked_by_emails,
            "distance_km": round(distance, 2) if distance is not None else None,
            "compatibility_score": compatibility['total_score'],
            "score_breakdown": {  # Detailed matching reasons
                'content_similarityyy': {
                    'score': f"{(compatibility['content_similarity']['score']):.1f}/70",
                    'matched_features': compatibility['content_similarity']['matched_features']
                },
               'location': {
                'score': f"{round(compatibility['location']['score'])}/10",  
                'distance': f"{distance:.1f} km" if distance else "Unknown"
                },
                'age': {
                    'score': f"{round(compatibility['age']['score'])}/10",  
                    'details': compatibility['age'].get('match', 'Not specified')
                },
                'interests': {
                    'score': f"{round(compatibility['interests']['score'])}/10", 
                    'common_hobbies': compatibility['interests']['common_hobbies'],
                    'match_percentage': compatibility['interests'].get('match_percentage', '0%')
                },
               
            }
        }

    def get_profiles(self, request, current_email):
        user = self.users.find_one({"email": current_email})
        if not user:
            return {"profiles": []}

        user_detail = self._get_document(self.details, user["_id"])
        if not user_detail:
            return {"profiles": []}

        user_interests = self._get_document(self.interests, user["_id"])
        user_location = self._get_location(user_detail)
        liked_emails, liked_by_emails = self._get_swipe_data(current_email)
        partner_gender_pref = self._get_gender_preference(user_interests or {})

        profiles = []
        for candidate in self.users.find({"email": {"$ne": current_email}}):
            profile = self._process_candidate(
                request, candidate, partner_gender_pref,
                liked_emails, liked_by_emails,
                user_detail, user_interests, user_location
            )
            if profile:
                profiles.append(profile)

        profiles.sort(key=lambda x: -x["compatibility_score"])

        return {
            "profiles": profiles,
            "logged_in_user": self._build_user_profile(request, user, user_detail, user_interests)
        }

    def _get_gender_preference(self, user_interests):
        if not user_interests:
            return "any"
        
        if "looking_for" in user_interests and isinstance(user_interests["looking_for"], dict):
            if "gender" in user_interests["looking_for"]:
                pref = user_interests["looking_for"]["gender"]
                if pref:
                    return str(pref).strip().lower()
        
        if "gender_preference" in user_interests:
            pref = user_interests["gender_preference"]
            if pref:
                return str(pref).strip().lower()
        
        return "any"

    def _get_swipe_data(self, current_email):
        swiped_by_user = {s["target"] for s in self.swipes.find({"swiper": current_email})}
        swiped_on_user = {s["swiper"] for s in self.swipes.find({"target": current_email})}
        return swiped_by_user, swiped_on_user

    def _build_user_profile(self, request, user, user_detail, interests):
        looking_for = {}
        if user_detail:
            raw_interests = self._get_document(self.interests, user["_id"])
            if raw_interests and isinstance(raw_interests.get("looking_for"), dict):
                looking_for = raw_interests["looking_for"]

        return {
            "name": user.get("name"),
            "email": user.get("email"),
            "gender": user_detail.get("gender") if user_detail else None,
            "age": user_detail.get("age") if user_detail else None,
            "location": user_detail.get("location") if user_detail else None,
            "religion": user_detail.get("religion") if user_detail else None,
            "caste": user_detail.get("caste") if user_detail else None,
            "marital_status": user_detail.get("marital_status") if user_detail else None,
           
            "education": user_detail.get("education") if user_detail else None,
            "profession": user_detail.get("profession") if user_detail else None,
            "bio": user_detail.get("caption", "No bio available.") if user_detail else None,
            "personality": user_detail.get("personality", []) if user_detail else [],
            "hobbies": user_detail.get("hobbies", []) if user_detail else [],
            "looking_for": looking_for,
              "images": [self._build_photo_url(request, user.get("photo"))] if user.get("photo") else [self._build_photo_url(request, None)]
        }