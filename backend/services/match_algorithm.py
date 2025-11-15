from math import radians, sin, cos, sqrt, atan2
from bson.objectid import ObjectId
import re

class MatchAlgorithm:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.interests = db["user_interests"]
        self.swipes = db["swipes"]

    def _cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        if not vec1 or not vec2 or len(vec1) != len(vec2):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sqrt(sum(a ** 2 for a in vec1))
        magnitude2 = sqrt(sum(b ** 2 for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)

    def _encode_categorical(self, value, categories):
        return [1.0 if cat.lower() == str(value).lower().strip() else 0.0 for cat in categories]

    def _encode_list(self, value, all_options):
        value_set = self._to_set(value)
        return [1.0 if opt in value_set else 0.0 for opt in all_options]

    def _normalize_value(self, value, min_val, max_val):
        if max_val == min_val:
            return 0.5
        return (value - min_val) / (max_val - min_val)

    def _vectorize_profile(self, user_detail, user_prefs, distance_km=None):
 
        vector = []
        
        religions = ["hindu", "muslim", "christian", "sikh", "buddhist", "jain"]
        religion_val = str(user_detail.get("religion", "")).lower().strip()
        vector.extend(self._encode_categorical(religion_val, religions))
        
        education_levels = ["high school", "diploma", "bachelor's", "master's", "phd"]
        education_val = str(user_detail.get("education", "")).lower().strip()
        vector.extend(self._encode_categorical(education_val, education_levels))
        
        marital_statuses = ["single", "divorced", "widowed"]
        marital_val = str(user_detail.get("marital_status", "")).lower().strip()
        vector.extend(self._encode_categorical(marital_val, marital_statuses))
        
        genders = ["male", "female", "any"]
        gender_val = str(user_detail.get("gender", "")).lower().strip()
        vector.extend(self._encode_categorical(gender_val, genders))
        
        castes = ["brahmin", "chhetri", "thakuri", "newar", "tamang", "magar", "rai", 
                  "limbu", "sherpa", "gurung", "dalit", "tharu", "madhesi", "muslim"]
        caste_val = str(user_detail.get("caste", "")).lower().strip()
        vector.extend(self._encode_categorical(caste_val, castes))
        
        age = user_detail.get("age", 25)
        try:
            age = int(float(str(age).strip()))
        except:
            age = 25
        vector.append(self._normalize_value(age, 18, 60))
        
        height_val = user_detail.get("height") or user_prefs.get("height", "5'5\"")
        try:
            height_inches = self._height_to_inches(height_val)
            vector.append(self._normalize_value(height_inches, 48, 84))  
        except:
            vector.append(0.5)
        
        personality_options = ["homebody", "social butterfly", "balanced"]
        personality_val = str(user_prefs.get("personality", "")).lower().strip()
        vector.extend(self._encode_categorical(personality_val, personality_options))
        
        hobby_options = ["reading", "sports", "travel", "cooking", "music", 
                        "movies", "gaming", "art", "fitness", "photography"]
        hobbies_val = user_detail.get("hobbies", [])
        vector.extend(self._encode_list(hobbies_val, hobby_options))
        
        pet_prefs = ["love them", "usually don't prefer"]
        pet_val = str(user_prefs.get("pet_preference", "")).lower().strip()
        vector.extend(self._encode_categorical(pet_val, pet_prefs))
        
        family_types = ["joint", "nuclear"]
        family_val = str(user_prefs.get("family_type", "")).lower().strip()
        vector.extend(self._encode_categorical(family_val, family_types))
        
        family_values = ["traditional", "moderate", "liberal"]
        values_val = str(user_prefs.get("family_values", "")).lower().strip()
        vector.extend(self._encode_categorical(values_val, family_values))
        
        living_prefs = ["city", "village", "abroad"]
        living_val = str(user_prefs.get("living_preference", "")).lower().strip()
        vector.extend(self._encode_categorical(living_val, living_prefs))
        
        if distance_km is not None:
            if distance_km <= 20:
                distance_score = 1.0
            elif distance_km <= 100:
                distance_score = 1.0 - ((distance_km - 20) / 80)
            else:
                distance_score = 0.0
            vector.append(distance_score)
        else:
            vector.append(0.5)
        
        long_dist = str(user_prefs.get("long_distance", "no")).lower()
        vector.append(1.0 if long_dist == "yes" else 0.0)
        
        profession = str(user_prefs.get("profession", "")).lower().strip()
        vector.append(1.0 if profession else 0.0)
        
        return vector

    # --- Utility functions ---
    def _parse_preferences(self, preference_value):
        if not preference_value:
            return set()
        if isinstance(preference_value, list):
            return {str(item).strip().lower() for item in preference_value}
        if isinstance(preference_value, str):
            if "," in preference_value:
                return {item.strip().lower() for item in preference_value.split(",")}
            return {preference_value.strip().lower()}
        return set()

    def _apply_rule_based_filtering(self, user_prefs, candidate_data, candidate_prefs):
      
        preferred_genders = self._parse_preferences(user_prefs.get("gender", "any"))
        candidate_gender = str(candidate_data.get("gender", "")).lower()
        
        if "any" not in preferred_genders and candidate_gender not in preferred_genders:
            return False, f"User prefers {preferred_genders}, candidate is {candidate_gender}", "user"
        
        candidate_preferred_genders = self._parse_preferences(candidate_prefs.get("gender", "any"))
        user_gender = str(candidate_data.get("gender", "")).lower()  
        if "any" not in candidate_preferred_genders:
            pass 

        user_caste_prefs = self._parse_preferences(user_prefs.get("caste", []))
        candidate_caste = str(candidate_data.get("caste", "")).lower()
        
        all_castes = {"brahmin", "chhetri", "thakuri", "newar", "tamang", "magar", "rai", 
                      "limbu", "sherpa", "gurung", "dalit", "tharu", "madhesi", "muslim"}
        
        user_selected_all_castes = len(user_caste_prefs) >= len(all_castes)
        
        if not user_selected_all_castes and "any" not in user_caste_prefs and candidate_caste:
            if candidate_caste not in user_caste_prefs:
                return False, f"User prefers {user_caste_prefs}, candidate is {candidate_caste}", "user"
        
        candidate_caste_prefs = self._parse_preferences(candidate_prefs.get("caste", []))
        candidate_selected_all_castes = len(candidate_caste_prefs) >= len(all_castes)
        
        pref_age_val = user_prefs.get("age_group") or user_prefs.get("age") or user_prefs.get("preferred_age")
        cand_age_raw = candidate_data.get("age")
        
        if pref_age_val and cand_age_raw:
            try:
                cand_age = int(float(str(cand_age_raw).strip()))
                clean_str = str(pref_age_val).replace(" ", "")
                
                if "-" in clean_str:
                    min_age, max_age = map(int, clean_str.split("-"))
                else:
                    min_age = max_age = int(clean_str)
                
                if not (min_age <= cand_age <= max_age):
                    return False, f"User prefers age {min_age}-{max_age}, candidate is {cand_age}", "user"
            except Exception:
                pass
        
        candidate_pref_age = candidate_prefs.get("age_group") or candidate_prefs.get("age") or candidate_prefs.get("preferred_age")

        return True, "Passed all filters", None

    def _profession_match(self, user_prof, candidate_prof):
        if not user_prof or not candidate_prof:
            return False
        user_prof = str(user_prof).strip().lower()
        candidate_prof = str(candidate_prof).strip().lower()
        return user_prof == candidate_prof or user_prof in candidate_prof or candidate_prof in user_prof

    def _haversine(self, lat1, lon1, lat2, lon2):
        R = 6371.0
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    def _get_location(self, user_detail):
        coords = user_detail.get("location_coordinates") or {}
        lat = coords.get("lat") or user_detail.get("latitude")
        lng = coords.get("lng") or user_detail.get("longitude")
        if lat is not None and lng is not None:
            return {"lat": float(lat), "lng": float(lng)}
        return None

    def _to_set(self, val):
        if not val:
            return set()
        if isinstance(val, list):
            return {str(v).strip().lower() for v in val if v}
        if isinstance(val, str):
            if "," in val:
                return {s.strip().lower() for s in val.split(",") if s.strip()}
            return {s.strip().lower() for s in val.split() if s.strip()}
        return set()
    
    def _to_list(self, val):
        if not val:
            return []
        if isinstance(val, list):
            return [str(v).strip() for v in val if v]
        if isinstance(val, str):
            if "," in val:
                return [s.strip() for s in val.split(",") if s.strip()]
            # Single value or space-separated
            return [s.strip() for s in val.split() if s.strip()] if " " in val else [val.strip()]
        return [str(val)]

    def _height_to_inches(self, h):
        s = str(h).replace(" ", "")
        if "'" in s:
            parts = s.split("'")
            ft = parts[0]
            inch = parts[1].replace('"', '').strip() if len(parts) > 1 else "0"
            inch = inch if inch else "0"
            return int(ft) * 12 + int(inch)
        if "cm" in s:
            return int(round(int(s.replace("cm", "")) / 2.54))
        return int(float(s))

    def _calculate_detailed_breakdown(self, user_detail, user_interests, candidate_detail, candidate_prefs):

        user_prefs = user_interests.get("looking_for", {})
        feature_scores = {}
        matched_features = []
        unmatched_features = []

        features_list = ["religion", "education", "profession", "hobbies", "personality",
                         "height", "marital_status", "pet_preference", "family_type",
                         "family_values", "living_preference", "age"]

        for key in features_list:
            if key == "profession":
                u_val = user_prefs.get("profession")
                c_val = candidate_detail.get("profession")
            else:
                u_val = user_detail.get(key) or user_prefs.get(key)
                c_val = candidate_detail.get(key) or candidate_prefs.get(key)

            if key == "age":
                looking_for = user_interests.get("looking_for", {})
                pref_age_val = looking_for.get("age_group") or looking_for.get("age") or looking_for.get("preferred_age")
                cand_age_raw = candidate_detail.get("age")
                if not pref_age_val or not cand_age_raw:
                    feature_scores[key] = 0.0
                    continue
                try:
                    cand_age = int(float(str(cand_age_raw).strip()))
                    clean_str = str(pref_age_val).replace(" ", "")
                    if "-" in clean_str:
                        min_age, max_age = map(int, clean_str.split("-"))
                    else:
                        min_age = max_age = int(clean_str)
                    if min_age <= cand_age <= max_age:
                        feature_scores[key] = 1.0
                        matched_features.append({"feature": key, "user_value": f"{min_age}-{max_age}", "candidate_value": cand_age})
                    else:
                        feature_scores[key] = 0.0
                        unmatched_features.append({"feature": key, "user_value": f"{min_age}-{max_age}", "candidate_value": cand_age})
                except:
                    feature_scores[key] = 0.0
                continue

            if key == "height":
                try:
                    pref_height = user_interests.get("looking_for", {}).get("height") or str(u_val)
                    cand_height = str(c_val).strip()
                    in_range = False

                    if pref_height and "-" in pref_height:
                        parts = pref_height.split("-")
                        min_h = self._height_to_inches(parts[0])
                        max_h = self._height_to_inches(parts[1])
                        cand_h = self._height_to_inches(cand_height)
                        in_range = min_h <= cand_h <= max_h
                    elif pref_height:
                        in_range = self._height_to_inches(pref_height) == self._height_to_inches(cand_height)

                    feature_scores[key] = 1.0 if in_range else 0.0
                    (matched_features if in_range else unmatched_features).append({
                        "feature": key,
                        "user_value": pref_height,
                        "candidate_value": cand_height
                    })
                except:
                    feature_scores[key] = 0.0
                continue

            if key == "profession":
                if u_val and c_val:
                    is_match = self._profession_match(u_val, c_val)
                    feature_scores[key] = 1.0 if is_match else 0.0
                    (matched_features if is_match else unmatched_features).append({
                        "feature": key,
                        "user_value": u_val,
                        "candidate_value": c_val
                    })
                else:
                    feature_scores[key] = 0.0
                continue

            # Default exact or list match
            if isinstance(u_val, list) or isinstance(c_val, list):
                u_set = self._to_set(u_val)
                c_set = self._to_set(c_val)
                inter = u_set & c_set
                union = u_set | c_set
                score = len(inter) / len(union) if union else 0.0
                feature_scores[key] = score
                (matched_features if score > 0 else unmatched_features).append({
                    "feature": key,
                    "user_value": list(u_set),
                    "candidate_value": list(c_set)
                })
            else:
                if str(u_val).strip().lower() == str(c_val).strip().lower():
                    feature_scores[key] = 1.0
                    matched_features.append({"feature": key, "user_value": u_val, "candidate_value": c_val})
                else:
                    feature_scores[key] = 0.0
                    unmatched_features.append({"feature": key, "user_value": u_val, "candidate_value": c_val})

        return feature_scores, matched_features, unmatched_features

    # --- Compatibility calculation ---
    def _calculate_compatibility(self, user_detail, user_interests, candidate_detail, candidate_prefs, distance_km):
        score_breakdown = {
            "total_score": 0,
            "cosine_similarity_score": 0,
            "feature_scores": {},
            "feature_match_list": {"matched": [], "unmatched": []},
            "location": {"score": 0, "distance_km": distance_km, "status": ""},
            "filter_passed": True,
            "rejection_reason": None,
            "incompatible_side": None,
            "compatibility_summary": ""
        }

        # Apply rule-based filtering first
        user_prefs = user_interests.get("looking_for", {})
        passed, reason, incompatible_side = self._apply_rule_based_filtering(user_prefs, candidate_detail, candidate_prefs)
        
        if not passed:
            score_breakdown["filter_passed"] = False
            score_breakdown["rejection_reason"] = reason
            score_breakdown["incompatible_side"] = incompatible_side
            score_breakdown["total_score"] = "Not Compatible"  # Show as text instead of 0
            score_breakdown["cosine_similarity_score"] = 0
            
            # Still calculate detailed breakdown even if filtered out
            feature_scores, matched, unmatched = self._calculate_detailed_breakdown(
                user_detail, user_interests, candidate_detail, candidate_prefs
            )
            score_breakdown["feature_scores"] = {k: round(v, 3) for k, v in feature_scores.items()}
            score_breakdown["feature_match_list"] = {"matched": matched, "unmatched": unmatched}
            
            # Add location info even for incompatible profiles
            if distance_km is not None:
                if distance_km <= 20:
                    loc_status = "Very close"
                elif distance_km <= 50:
                    loc_status = "Nearby"
                elif distance_km <= 100:
                    loc_status = "Moderate distance"
                else:
                    loc_status = "Long distance"
                score_breakdown["location"]["status"] = loc_status
                score_breakdown["location"]["distance_km"] = round(distance_km, 2)
            
            side_text = f"Incompatible from {incompatible_side}'s side" if incompatible_side else "Incompatible"
            score_breakdown["compatibility_summary"] = f"{side_text}: {reason}"
            return score_breakdown

        # Calculate PURE content-based similarity using cosine similarity
        user_vector = self._vectorize_profile(user_detail, user_prefs, 0)
        candidate_vector = self._vectorize_profile(candidate_detail, candidate_prefs, distance_km)
        
        cosine_score = self._cosine_similarity(user_vector, candidate_vector)
        cosine_percentage = round(cosine_score * 100, 2)
        
        score_breakdown["cosine_similarity_score"] = cosine_percentage
        score_breakdown["total_score"] = min(100, round(cosine_percentage))
        # print(f"CF cosine_similarity_score filtered: {score_breakdown["cosine_similarity_score"]}")

        #  detailed breakdown 
        feature_scores, matched, unmatched = self._calculate_detailed_breakdown(
            user_detail, user_interests, candidate_detail, candidate_prefs
        )
        
        score_breakdown["feature_scores"] = {k: round(v, 3) for k, v in feature_scores.items()}
        score_breakdown["feature_match_list"] = {"matched": matched, "unmatched": unmatched}

        # Location info
        if distance_km is not None:
            if distance_km <= 20:
                loc_status = "Very close"
            elif distance_km <= 50:
                loc_status = "Nearby"
            elif distance_km <= 100:
                loc_status = "Moderate distance"
            else:
                loc_status = "Long distance"
            score_breakdown["location"]["status"] = loc_status
            score_breakdown["location"]["distance_km"] = round(distance_km, 2)

        score_breakdown["compatibility_summary"] = (
            f"Cosine Similarity: {cosine_percentage}% | "
            f"Features matched: {len(matched)}/{len(matched) + len(unmatched)}"

# 
        )

        print(f" cosine_similarity_score filtered: {cosine_percentage}%")
        return score_breakdown

    # --- DB helpers ---
    def _get_document(self, collection, user_id):
        return collection.find_one({"user_id": user_id}) or collection.find_one({"user_id": str(user_id)})

    def _get_swipe_data(self, current_email):
        swiped_by_user = {s["target"] for s in self.swipes.find({"swiper": current_email})}
        swiped_on_user = {s["swiper"] for s in self.swipes.find({"target": current_email})}
        return swiped_by_user, swiped_on_user

    def _build_photo_url(self, request, raw_photo):
        base_url = request.host_url.rstrip("/")
        if raw_photo:
            if raw_photo.startswith("/uploads/"):
                return f"{base_url}{raw_photo}"
            return raw_photo
        return f"{base_url}/default-profile.jpg"

    # --- Candidate processing ---
    def _process_candidate(self, request, candidate, liked_emails, liked_by_emails, user_detail, user_interests, user_location):
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
            distance = self._haversine(user_location["lat"], user_location["lng"], candidate_location["lat"], candidate_location["lng"])

        compatibility = self._calculate_compatibility(user_detail, user_interests, detail, looking_for, distance or 0)
        
        hobbies = self._to_list(detail.get("hobbies", []))
        personality = self._to_list(detail.get("personality", []))
        
        profile = {
            "id": str(candidate["_id"]),
            "name": candidate.get("name"),
            "email": email,
            "age": detail.get("age"),
            "gender": detail.get("gender"),
            "religion": detail.get("religion"),
            "caste": detail.get("caste"),
            "marital_status": detail.get("marital_status"),
            "height": detail.get("height"),
            "pet_preference": looking_for.get("pet_preference"),
            "family_type": looking_for.get("family_type"),
            "family_values": looking_for.get("family_values"),
            "living_preference": looking_for.get("living_preference"),
            "open_to_long_distance": looking_for.get("long_distance"),
            "location": detail.get("location"),
            "profession": detail.get("profession"),
            "education": detail.get("education"),
            "bio": detail.get("caption", "No bio available."),
            "personality": personality,
            "hobbies": hobbies,
            "images": [self._build_photo_url(request, candidate.get("photo"))],
            "is_match": email in liked_by_emails,
            "distance_km": round(distance, 2) if distance else None,
            "compatibility_score": compatibility["total_score"],
            "is_compatible": compatibility["filter_passed"],
            "incompatible_side": compatibility.get("incompatible_side"),
            "score_breakdown": compatibility
        }
        print(f"Compatibility for {candidate.get('name')} ({email}): {compatibility['total_score']}")
        return profile
        print(f"Compatibility for {candidate.get('name')}: {compatibility['total_score']}")


    # --- Main API ---
    def get_profiles(self, request, current_email):
        user = self.users.find_one({"email": current_email})
        if not user:
            return {"profiles": []}
        user_detail = self._get_document(self.details, user["_id"])
        if not user_detail:
            return {"profiles": []}
        user_interests = self._get_document(self.interests, user["_id"]) or {}
        looking_for = user_interests.get("looking_for", {})
        user_location = self._get_location(user_detail)
        liked_emails, liked_by_emails = self._get_swipe_data(current_email)
        profiles = []
        for candidate in self.users.find({"email": {"$ne": current_email}}):
            profile = self._process_candidate(request, candidate, liked_emails, liked_by_emails, user_detail, user_interests, user_location)
            if profile:
                profiles.append(profile)
        
      
        def sort_key(profile):
            is_compatible = profile.get("is_compatible", True)
            score = profile["compatibility_score"]
            if not is_compatible or score == "Not Compatible":
                return (1, 0)  # (not compatible=1, score=0)
            return (0, -score)  
        
        profiles.sort(key=sort_key)
        
        personality_pref = self._to_list(looking_for.get("personality", []))
        hobbies_user = self._to_list(user_detail.get("hobbies", []))
        
        return {
            "profiles": profiles,
            "logged_in_user": {
                "name": user.get("name"),
                "email": user.get("email"),
                "gender": user_detail.get("gender"),
                "age": user_detail.get("age"),
                "location": user_detail.get("location"),
                "religion": user_detail.get("religion"),
                "caste": user_detail.get("caste"),
                "marital_status": user_detail.get("marital_status"),
                "height": user_detail.get("height"),
                "pet_preference": looking_for.get("pet_preference"),
                "family_type": looking_for.get("family_type"),
                "family_values": looking_for.get("family_values"),
                "living_preference": looking_for.get("living_preference"),
                "open_to_long_distance": looking_for.get("long_distance"),
                "education": user_detail.get("education"),
                "profession": user_detail.get("profession"),
                "bio": user_detail.get("caption", "No bio available."),
                "personality": personality_pref,
                "hobbies": hobbies_user,
                "images": [self._build_photo_url(request, user.get("photo"))],
                "looking_for": looking_for
            }
        }