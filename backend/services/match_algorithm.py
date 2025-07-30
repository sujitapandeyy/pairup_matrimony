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
            return {"preferred_gender": None, "profiles": [], "logged_in_user": None, "user_interests": None}

        user_detail = self._get_document(self.details, user["_id"])
        user_interests = self._get_document(self.interests, user["_id"])
        user_interests_list = self._get_interests_list(user_interests, user_detail)

        logged_in_user = self._build_user_profile(request, user, user_detail, user_interests_list)
        partner_gender_pref = self._get_gender_preference(user_interests)
        liked_emails, liked_by_emails = self._get_swipe_data(current_email)
        user_location = self._get_location(user_detail)

        profiles = []
        for candidate in self.users.find():
            if candidate.get("email") == current_email:
                continue

            candidate_profile = self._process_candidate(
                request, candidate, partner_gender_pref,
                liked_emails, liked_by_emails,
                user_detail, user_interests_list,
                user_location
            )
            if candidate_profile:
                profiles.append(candidate_profile)

        profiles.sort(key=lambda x: -(x["compatibility_score"] or 0))

        return {
            "preferred_gender": partner_gender_pref,
            "profiles": profiles,
            "logged_in_user": logged_in_user,
        }

    def _get_document(self, collection, user_id):
        return collection.find_one({"user_id": user_id}) or collection.find_one({"user_id": str(user_id)})

    def _get_interests_list(self, interests_doc, details_doc):
        """Extracts a clean list of interests, hobbies, and personality traits"""
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
        liked_emails = {s["target"] for s in self.swipes.find({"swiper": current_email, "liked": True})}
        liked_by_emails = {s["swiper"] for s in self.swipes.find({"target": current_email, "liked": True})}
        return liked_emails, liked_by_emails

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

    def _process_candidate(self, request, candidate, partner_gender_pref, liked_emails, liked_by_emails, user_detail, user_interests_list, user_location):
        email = candidate.get("email")
        if email in liked_emails:
            return None

        detail = self._get_document(self.details, candidate["_id"])
        if not detail:
            return None

        # Gender filtering (already there)
        candidate_gender = str(detail.get("gender", "")).strip().lower()
        if partner_gender_pref != "any":
            preferred_genders = [g.strip() for g in partner_gender_pref.split(",")]
            if candidate_gender not in preferred_genders:
                return None

        # *** Add caste filtering here ***
        # user_looking_for = {}
        # raw_interests = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
        # if raw_interests and isinstance(raw_interests.get("looking_for"), dict):
        #     user_looking_for = raw_interests.get("looking_for", {})

        # preferred_castes = []
        # caste_pref = user_looking_for.get("caste")
        # if caste_pref:
        #     if isinstance(caste_pref, list):
        #         preferred_castes = [c.lower() for c in caste_pref]
        #     else:
        #         preferred_castes = [str(caste_pref).lower()]

        # candidate_caste = str(detail.get("caste", "")).lower()
        # if preferred_castes and candidate_caste not in preferred_castes:
        #     return None

        candidate_interests = self._get_document(self.interests, candidate["_id"])
        candidate_interests_list = self._get_interests_list(candidate_interests, detail)
        candidate_location = self._get_location(detail)

        distance = None
        if user_location and candidate_location:
            try:
                if all(k in user_location for k in ("lat", "lng")) and all(k in candidate_location for k in ("lat", "lng")):
                    distance = self._haversine(
                        float(user_location["lat"]), float(user_location["lng"]),
                        float(candidate_location["lat"]), float(candidate_location["lng"])
                    )
            except (ValueError, TypeError, KeyError):
                distance = None

        compatibility_score = self._calculate_compatibility(
            user_detail, user_interests_list,
            detail, candidate_interests_list,
            distance
        )

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
            "location_coordinates": candidate_location,
            "profession": detail.get("profession"),
            "education": detail.get("education"),
            "bio": detail.get("caption", "No bio available."),
            "personality": detail.get("personality", []),
            "hobbies": detail.get("hobbies", []),
            "images": [self._build_photo_url(request, candidate.get("photo"))],
            "is_match": email in liked_by_emails,
            "distance_km": round(distance, 2) if distance is not None else None,
            "Looking_for": candidate_interests.get("looking_for") if candidate_interests and isinstance(candidate_interests.get("looking_for"), dict) else {},
            "compatibility_score": compatibility_score
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
        traits1 = [str(t).strip().lower() for t in traits1 if str(t).strip()]
        traits2 = [str(t).strip().lower() for t in traits2 if str(t).strip()]
        if not traits1 or not traits2:
            return 0
        text1 = " ".join(traits1)
        text2 = " ".join(traits2)
        try:
            vectorizer = CountVectorizer(lowercase=False, token_pattern=r'(?u)\b\w+\b')
            vectorizer.fit([text1, text2])
            vectors = vectorizer.transform([text1, text2]).toarray()
            return cosine_similarity([vectors[0]], [vectors[1]])[0][0] if vectors.shape[1] > 0 else 0
        except Exception:
            return 0

    def _calculate_compatibility(self, user_detail, user_interests, candidate_detail, candidate_interests, distance_km):
        score = 0
        total_weight = 0

        # Age compatibility (10 points)
        # Bidirectional Age Compatibility (10 points total: 5 + 5)
        age_points = 0

        try:
            user_age = user_detail.get("age")
            candidate_age = candidate_detail.get("age")
            # print("user_detail:", user_detail)

            # 1. Candidate's age within user's preferred range (5 points)
            interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
            user_pref_age = None
            if interests_doc:
                looking_for = interests_doc.get("looking_for", {})
                user_pref_age = looking_for.get("age_group")

            if user_pref_age:
                try:
                    min_age, max_age = map(int, user_pref_age.strip().split('-'))
                    if min_age <= candidate_age <= max_age:
                        age_points += 5
                except ValueError:
                    pass


            # 2. User's age within candidate's preferred range (5 points)
            candidate_interests_doc = self._get_document(self.interests, candidate_detail.get("user_id") or candidate_detail.get("_id"))
            if candidate_interests_doc and isinstance(candidate_interests_doc.get("looking_for"), dict):
                cand_pref_age = candidate_interests_doc["looking_for"].get("age_group")
                if cand_pref_age:
                    min_cand_age, max_cand_age = map(int, cand_pref_age.strip().split('-'))
                    if min_cand_age <= user_age <= max_cand_age:
                        age_points += 5
        except:
            pass

        score += age_points
        total_weight += 10


        # # --- Religion Compatibility (10 points) ---
        try:
            if user_detail and candidate_detail:
                user_religion = str(user_detail.get("religion", "")).strip().lower()
                candidate_religion = str(candidate_detail.get("religion", "")).strip().lower()
          
                # Get user religion preferences from interests 'looking_for'
                interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                user_religion_pref = []
                if interests_doc:
                    looking_for = interests_doc.get("looking_for", {})
                    religion_pref = looking_for.get("religion") or looking_for.get("religions")
                    if religion_pref:
                        if isinstance(religion_pref, list):
                            user_religion_pref = [r.strip().lower() for r in religion_pref if r]
                        else:
                            user_religion_pref = [str(religion_pref).strip().lower()]

                # Allow 'any' to mean all religions are accepted
                religion_matches_pref = (
                    not user_religion_pref or 
                    "any" in user_religion_pref or 
                    candidate_religion in user_religion_pref
                )

                if religion_matches_pref:
                    score += 10
        except Exception as e:
            print("RELIGION MATCH ERROR:", e)

        total_weight += 10
        # # --- education_level Compatibility (10 points) ---
        try:
            if user_detail and candidate_detail:
                user_education_level = str(user_detail.get("education_level") or user_detail.get("education") or "").strip().lower()
                candidate_education_level = str(candidate_detail.get("education_level") or candidate_detail.get("education") or "").strip().lower()

          
                # Get user education_level preferences from interests 'looking_for'
                interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                user_education_level_pref = []
                if interests_doc:
                    looking_for = interests_doc.get("looking_for", {})
                    education_level_pref = looking_for.get("education_level") or looking_for.get("education_levels")
                    if education_level_pref:
                        if isinstance(education_level_pref, list):
                            user_education_level_pref = [r.strip().lower() for r in education_level_pref if r]
                        else:
                            user_education_level_pref = [str(education_level_pref).strip().lower()]

                # Allow 'any' to mean all education_levels are accepted
                education_level_matches_pref = (
                    not user_education_level_pref or 
                    "any" in user_education_level_pref or 
                    candidate_education_level in user_education_level_pref
                )

                if education_level_matches_pref:
                    score += 10
        except Exception as e:
            print("education_level MATCH ERROR:", e)

        total_weight += 10

        # --- Profession Compatibility (5 points) ---
        try:
            if user_detail and candidate_detail:
                candidate_profession = str(candidate_detail.get("profession", "")).strip().lower()

                # Get user profession preferences from interests 'looking_for'
                interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                user_profession_pref = []
                if interests_doc:
                    looking_for = interests_doc.get("looking_for", {})
                    profession_pref = looking_for.get("profession") or looking_for.get("professions")
                    if profession_pref:
                        if isinstance(profession_pref, list):
                            user_profession_pref = [p.strip().lower() for p in profession_pref if p]
                        else:
                            user_profession_pref = [str(profession_pref).strip().lower()]

                # Check if candidate profession matches user preference (or no preference)
                profession_matches_pref = (not user_profession_pref) or (candidate_profession in user_profession_pref)

                if profession_matches_pref and candidate_profession == candidate_detail.get("profession", "").strip().lower():
                    score += 5
        except Exception as e:
            # optionally log the exception
            pass

        total_weight += 5

        # --- Hobby Compatibility (10 points, proportionally) ---
        try:
            if user_detail and candidate_detail:
                user_hobbies = user_detail.get("hobbies", [])
                candidate_hobbies = candidate_detail.get("hobbies", [])

                if isinstance(user_hobbies, str):
                    user_hobbies = [h.strip().lower() for h in user_hobbies.split(",") if h.strip()]
                elif isinstance(user_hobbies, list):
                    user_hobbies = [str(h).strip().lower() for h in user_hobbies if h]

                if isinstance(candidate_hobbies, str):
                    candidate_hobbies = [h.strip().lower() for h in candidate_hobbies.split(",") if h.strip()]
                elif isinstance(candidate_hobbies, list):
                    candidate_hobbies = [str(h).strip().lower() for h in candidate_hobbies if h]

                if user_hobbies and candidate_hobbies:
                    matched_hobbies = set(user_hobbies).intersection(set(candidate_hobbies))
                    match_ratio = len(matched_hobbies) / len(set(user_hobbies))
                    hobby_score = match_ratio * 10  # weight is 10
                    score += hobby_score
        except Exception as e:
            print("HOBBY MATCH ERROR:", e)

        total_weight += 10

# --- Marital Status Compatibility (10 points) ---
        try:
            if user_detail and candidate_detail:
                user_marital_status = str(user_detail.get("marital_status", "")).strip().lower()
                candidate_marital_status = str(candidate_detail.get("marital_status", "")).strip().lower()
                
                # Get user marital status preferences from interests 'looking_for'
                interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                user_marital_pref = []
                if interests_doc:
                    looking_for = interests_doc.get("looking_for", {})
                    marital_pref = looking_for.get("marital_status") or looking_for.get("marital_statuses")
                    if marital_pref:
                        if isinstance(marital_pref, list):
                            user_marital_pref = [m.strip().lower() for m in marital_pref if m]
                        else:
                            user_marital_pref = [str(marital_pref).strip().lower()]
                
                # 'any' means accept all
                marital_matches_pref = (
                    not user_marital_pref or
                    "any" in user_marital_pref or
                    candidate_marital_status in user_marital_pref
                )

                if marital_matches_pref:
                    score += 10
        except Exception as e:
            print("MARITAL STATUS MATCH ERROR:", e)

        total_weight += 10

        # --- Long-Distance Compatibility (Up to 10 points, distance-sensitive) ---
        try:
            if user_detail and candidate_detail:
                # Get user's long-distance preference from interests
                interests_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                prefers_long_distance = False
                if interests_doc:
                    looking_for = interests_doc.get("looking_for", {})
                    long_distance_pref = str(looking_for.get("long_distance", "")).strip().lower()
                    prefers_long_distance = long_distance_pref in ["yes", "true", "1"]
                if prefers_long_distance:
                    score += 10
                else:
                        if distance_km <= 100:
                            penalty_percent = distance_km / 100  # e.g., 75km → 0.75
                            score += round(10 * (1 - penalty_percent), 2)
                        else:
                            score += 0  # Too far for user who doesn't prefer long-distance
        except Exception as e:
            print("LONG DISTANCE MATCH ERROR:", e)
        total_weight += 10

        try:
            if user_detail and candidate_detail:
                user_persionality = str(user_detail.get("personality", "")).strip().lower()
                candidate_personality = str(candidate_detail.get("personality", "")).strip().lower()
          
                # Get user personality preferences from interests 'looking_for'
                personality_doc = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
                user_personality_pref = []
                if personality_doc:
                    looking_for = personality_doc.get("looking_for", {})
                    personality_pref = looking_for.get("personality") or looking_for.get("personality")
                    if personality_pref:
                        if isinstance(personality_pref, list):
                            user_personality_pref = [r.strip().lower() for r in personality_pref if r]
                        else:
                            user_personality_pref = [str(personality_pref).strip().lower()]

                # Allow 'any' to mean all persionality are accepted
                personality_matches_pref = (
                    not user_personality_pref or 
                    "any" in user_personality_pref or 
                    candidate_personality in user_personality_pref
                )

                if personality_matches_pref:
                    score += 10
        except Exception as e:
            print("personality MATCH ERROR:", e)

        total_weight += 10

        try:
            # Get interests (looking_for) of both users
            user_interests = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
            candidate_interests = self._get_document(self.interests, candidate_detail.get("user_id") or candidate_detail.get("_id"))

            user_living_pref = []
            candidate_living_pref = []

            if user_interests:
                looking_for = user_interests.get("looking_for", {})
                pref = looking_for.get("living_preference")
                if pref:
                    user_living_pref = [str(p).strip().lower() for p in pref] if isinstance(pref, list) else [str(pref).strip().lower()]

            if candidate_interests:
                looking_for = candidate_interests.get("looking_for", {})
                pref = looking_for.get("living_preference")
                if pref:
                    candidate_living_pref = [str(p).strip().lower() for p in pref] if isinstance(pref, list) else [str(pref).strip().lower()]

            # Match logic including "any"
            living_pref_match = (
                "any" in user_living_pref or
                "any" in candidate_living_pref or
                any(p in user_living_pref for p in candidate_living_pref)
            )

            if living_pref_match:
                score += 10
        except Exception as e:
            print("LIVING PREFERENCE MATCH ERROR:", e)

        total_weight += 10

        try:
            user_interests = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
            candidate_interests = self._get_document(self.interests, candidate_detail.get("user_id") or candidate_detail.get("_id"))
            user_family_type = []
            candidate_family_type = []

            if user_interests:
                looking_for = user_interests.get("looking_for", {})
                ftype = looking_for.get("family_type")
                if ftype:
                    user_family_type = [str(f).strip().lower() for f in ftype] if isinstance(ftype, list) else [str(ftype).strip().lower()]

            if candidate_interests:
                looking_for = candidate_interests.get("looking_for", {})
                ftype = looking_for.get("family_type")
                if ftype:
                    candidate_family_type = [str(f).strip().lower() for f in ftype] if isinstance(ftype, list) else [str(ftype).strip().lower()]

            family_type_match = (
                "any" in user_family_type or
                "any" in candidate_family_type or
                any(f in user_family_type for f in candidate_family_type)
            )

            if family_type_match:
                score += 10
        except Exception as e:
            print("FAMILY TYPE MATCH ERROR:", e)

        total_weight += 10


        try:
            user_interests = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
            candidate_interests = self._get_document(self.interests, candidate_detail.get("user_id") or candidate_detail.get("_id"))
            user_family_values = []
            candidate_family_values = []

            if user_interests:
                looking_for = user_interests.get("looking_for", {})
                fval = looking_for.get("family_values")
                if fval:
                    user_family_values = [str(f).strip().lower() for f in fval] if isinstance(fval, list) else [str(fval).strip().lower()]

            if candidate_interests:
                looking_for = candidate_interests.get("looking_for", {})
                fval = looking_for.get("family_values")
                if fval:
                    candidate_family_values = [str(f).strip().lower() for f in fval] if isinstance(fval, list) else [str(fval).strip().lower()]

            family_values_match = (
                "any" in user_family_values or
                "any" in candidate_family_values or
                any(f in user_family_values for f in candidate_family_values)
            )

            if family_values_match:
                score += 10
        except Exception as e:
            print("FAMILY VALUE MATCH ERROR:", e)

        total_weight += 10

        # --- Pet Preference Compatibility (10 points) ---
        try:
            user_interests = self._get_document(self.interests, user_detail.get("user_id") or user_detail.get("_id"))
            candidate_interests = self._get_document(self.interests, candidate_detail.get("user_id") or candidate_detail.get("_id"))

            user_pet_preference = []
            candidate_pet_preference = []

            if user_interests:
                looking_for = user_interests.get("looking_for", {})
                pet_pref = looking_for.get("pet_preference")
                if pet_pref:
                    user_pet_preference = [str(p).strip().lower() for p in pet_pref] if isinstance(pet_pref, list) else [str(pet_pref).strip().lower()]

            if candidate_interests:
                looking_for = candidate_interests.get("looking_for", {})
                pet_pref = looking_for.get("pet_preference")
                if pet_pref:
                    candidate_pet_preference = [str(p).strip().lower() for p in pet_pref] if isinstance(pet_pref, list) else [str(pet_pref).strip().lower()]

            pet_preference_match = (
                "any" in user_pet_preference or
                "any" in candidate_pet_preference or
                any(p in user_pet_preference for p in candidate_pet_preference)
            )
            if pet_preference_match:
                score += 10
        except Exception as e:
            print("PET PREFERENCE MATCH ERROR:", e)
        total_weight += 10



        return round((score / total_weight) * 100, 2) if total_weight else 0
