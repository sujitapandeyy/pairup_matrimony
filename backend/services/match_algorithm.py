from math import radians, sin, cos, sqrt, atan2
from bson.objectid import ObjectId
import re

class MatchAlgorithm:
    def __init__(self, db):
        self.users = db["users"]
        self.details = db["user_details"]
        self.interests = db["user_interests"]
        self.swipes = db["swipes"]

    # --- Core similarity functions ---
    def _cosine_similarity(self, vec1, vec2):
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sqrt(sum(a ** 2 for a in vec1))
        magnitude2 = sqrt(sum(b ** 2 for b in vec2))
        if magnitude1 == 0 or magnitude2 == 0:
            return 0
        return dot_product / (magnitude1 * magnitude2)

    def _text_to_vector(self, text):
        words = text.lower().split()
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        return word_counts

    def _vectorize_features(self, user_data, candidate_data, distance_km=None):
        features_list = [
            "religion", "education", "profession", "hobbies", "personality",
            "height", "marital_status", "pet_preference", "family_type",
            "family_values", "living_preference", "age", "open_to_long_distance"
        ]
        user_features = {
            k: " ".join(user_data.get(k, [])) if isinstance(user_data.get(k), list)
            else str(user_data.get(k, "")) for k in features_list
        }
        candidate_features = {
            k: " ".join(candidate_data.get(k, [])) if isinstance(candidate_data.get(k), list)
            else str(candidate_data.get(k, "")) for k in features_list
        }

        # Location soft scoring
        if distance_km is not None:
            if distance_km <= 20:
                loc_score = 10
            elif distance_km <= 100:
                extra_km = distance_km - 20
                blocks = (extra_km + 19) // 20
                loc_score = 10 / (2 ** blocks)
            else:
                loc_score = 0
            user_features["location_score"] = f"loc_{round(loc_score, 2)}"
            candidate_features["location_score"] = f"loc_{round(loc_score, 2)}"

        user_text = " ".join(user_features.values())
        candidate_text = " ".join(candidate_features.values())
        user_vec = self._text_to_vector(user_text)
        candidate_vec = self._text_to_vector(candidate_text)
        all_words = set(user_vec.keys()).union(set(candidate_vec.keys()))
        vec1 = [user_vec.get(word, 0) for word in all_words]
        vec2 = [candidate_vec.get(word, 0) for word in all_words]

        return vec1, vec2, user_features, candidate_features

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

    def _apply_rule_based_filtering(self, user_prefs, candidate_data):
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

    def _height_to_inches(self, h):
        s = str(h).replace(" ", "")
        if "'" in s:
            ft, inch = s.split("'")
            inch = inch.replace('"', '') or "0"
            return int(ft) * 12 + int(inch)
        if "cm" in s:
            return int(round(int(s.replace("cm", "")) / 2.54))
        return int(float(s))

    # --- Compatibility calculation ---
    def _calculate_compatibility(self, user_detail, user_interests, candidate_detail, candidate_prefs, distance_km):
        score_breakdown = {
            "total_score": 0,
            "feature_scores": {},
            "feature_match_list": {"matched": [], "unmatched": []},
            "content_similarity": {"score": 0, "status": ""},
            "location": {"score": 0, "distance_km": distance_km, "status": ""},
            "filter_passed": True,
            "rejection_reason": None,
            "compatibility_summary": ""
        }

        user_prefs = user_interests.get("looking_for", {})
        passed, reason = self._apply_rule_based_filtering(user_prefs, candidate_detail)
        if not passed:
            score_breakdown["filter_passed"] = False
            score_breakdown["rejection_reason"] = reason
            score_breakdown["compatibility_summary"] = f"Incompatible: {reason}"
            return score_breakdown

        vec1, vec2, features, candidate_features = self._vectorize_features(user_detail, candidate_detail, distance_km)
        content_score = self._cosine_similarity(vec1, vec2) * 100
        score_breakdown["content_similarity"]["score"] = round(content_score, 2)
        score_breakdown["content_similarity"]["status"] = "High" if content_score > 50 else "Low"

        feature_scores = {}
        matched_features = []
        unmatched_features = []

        features_list = ["religion", "education", "profession", "hobbies", "personality",
                         "height", "marital_status", "pet_preference", "family_type",
                         "family_values", "living_preference", "age", "open_to_long_distance"]

        for key in features_list:
            u_val = user_detail.get(key) or user_prefs.get(key)
            c_val = candidate_detail.get(key) or candidate_prefs.get(key)

            # --- Age remains same ---
            if key == "age":
                looking_for = user_interests.get("looking_for", {})
                pref_age_val = looking_for.get("age_group") or looking_for.get("age") or looking_for.get("preferred_age")
                cand_age_raw = candidate_detail.get("age")
                if not pref_age_val or not cand_age_raw:
                    feature_scores[key] = 0.0
                    continue
                try:
                    cand_age = int(float(str(cand_age_raw).strip()))
                    min_age = max_age = None
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

            # --- ✅ Height range fix ---
            # --- ✅ Height range fix ---
            if key == "height":
                try:
                    # Use the user's "looking_for" preference as user_value
                    pref_height = user_interests.get("looking_for", {}).get("height") or str(u_val)
                    cand_height = str(c_val).strip()
                    in_range = False

                    # If the user provided a range like "5'3\" - 5'5\""
                    if pref_height and "-" in pref_height:
                        parts = pref_height.split("-")
                        min_h = self._height_to_inches(parts[0])
                        max_h = self._height_to_inches(parts[1])
                        cand_h = self._height_to_inches(cand_height)
                        in_range = min_h <= cand_h <= max_h
                    elif pref_height:
                        # Single value
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

            # --- ✅ Profession partial match remains ---
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

            # --- ✅ Open to long distance fix ---
            if key == "open_to_long_distance":
                u_pref = user_prefs.get("long_distance") or u_val
                c_pref = candidate_prefs.get("long_distance") or c_val
                distance_val = distance_km or 0

                # Logic based on user preference
                score = 0.0
                status = "Not open to long distance"

                if str(u_pref).lower() == "yes" and str(c_pref).lower() == "yes":
                    score = 1.0
                    status = "Both open to long distance"
                elif str(u_pref).lower() in ["usually don't prefer", "usually dont prefer"]:
                    if distance_val <= 50:
                        score = 1.0
                        status = "Distance <50 km, accepted despite usually don't prefer"
                    else:
                        score = 0.0
                        status = "Distance >50 km, usually don't prefer"
                else:
                    score = 0.0
                    status = "Not open to long distance"

                feature_scores[key] = score
                (matched_features if score > 0 else unmatched_features).append({
                    "feature": key,
                    "user_value": u_pref,
                    "candidate_value": c_pref
                })
                score_breakdown["location"]["score"] = score
                score_breakdown["location"]["status"] = status
                continue


            # --- Default exact or list match ---
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

        total_percent = (sum(feature_scores.values()) / len(features_list)) * 100 if features_list else 0
        total_percent = min(100, round(total_percent))

        score_breakdown["feature_scores"] = {k: round(v, 3) for k, v in feature_scores.items()}
        score_breakdown["feature_match_list"] = {"matched": matched_features, "unmatched": unmatched_features}
        score_breakdown["total_score"] = total_percent
        score_breakdown["compatibility_summary"] = f"Features matched: {len(matched_features)}; Compatibility: {total_percent}%"

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
        if not compatibility["filter_passed"]:
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
            "height": looking_for.get("height"),
            "pet_preference": looking_for.get("pet_preference"),
            "family_type": looking_for.get("family_type"),
            "family_values": looking_for.get("family_values"),
            "living_preference": looking_for.get("living_preference"),
            "open_to_long_distance": looking_for.get("long_distance"),
            "location": detail.get("location"),
            "profession": detail.get("profession"),
            "education": detail.get("education"),
            "bio": detail.get("caption", "No bio available."),
            "personality": detail.get("personality", []),
            "hobbies": detail.get("hobbies", []),
            "images": [self._build_photo_url(request, candidate.get("photo"))],
            "is_match": email in liked_by_emails,
            "distance_km": round(distance, 2) if distance else None,
            "compatibility_score": compatibility["total_score"],
            "score_breakdown": compatibility
        }

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
        profiles.sort(key=lambda x: -x["compatibility_score"])
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
                "personality": looking_for.get("personality", []),
                "hobbies": user_detail.get("hobbies", []),
                "images": [self._build_photo_url(request, user.get("photo"))],
                "looking_for": looking_for
            }
        }
