# match_routes.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.match_service import MatchService
from services.match_algorithm import MatchAlgorithm
from bson.errors import InvalidId

match_bp = Blueprint("match_bp", __name__)

# ---------------- Profiles ----------------
@match_bp.route("/get_profiles", methods=["GET"])
@jwt_required()
def get_profiles():
    current_email = get_jwt_identity()
    service = MatchAlgorithm(current_app.mongo.db)
    profiles = service.get_profiles(request, current_email)
    return jsonify(profiles), 200

# @match_bp.route("/get_similar_profiles", methods=["GET"])
# @jwt_required()
# def get_similar_profiles():
#     profile_email = request.args.get("profile_email")
#     if not profile_email:
#         return jsonify({"error": "Missing profile_email"}), 400

#     service = MatchAlgorithm(current_app.mongo.db)
#     result = service.get_similar_profiles_for_profile(request, profile_email)
#     return jsonify(result), 200

# ---------------- Swipe ----------------
@match_bp.route("/swipe", methods=["POST"])
@jwt_required()
def swipe():
    current_email = get_jwt_identity()
    data = request.get_json()
    target = data.get("target_email")
    liked = data.get("liked")

    if not target or liked is None:
        return jsonify({"error": "Missing fields"}), 400

    service = MatchService(current_app.mongo.db)
    result = service.swipe(current_email, target, liked)
    return jsonify(result), 200

# ---------------- Notifications ----------------
@match_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    current_email = get_jwt_identity()
    service = MatchService(current_app.mongo.db)
    notes = service.get_notifications(current_email, request)
    return jsonify(notes), 200

@match_bp.route("/notifications/read", methods=["POST"])
@jwt_required()
def mark_read():
    data = request.get_json()
    note_id = data.get("notification_id")
    if not note_id:
        return jsonify({"error": "Missing ID"}), 400

    try:
        service = MatchService(current_app.mongo.db)
        result = service.mark_read(note_id)
        if result.modified_count == 0:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Marked as read"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid ID"}), 400

@match_bp.route("/ignore/<notification_id>", methods=["DELETE"])
@jwt_required()
def ignore(notification_id):
    try:
        service = MatchService(current_app.mongo.db)
        success = service.ignore(notification_id)
        if not success:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Ignored"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid ID"}), 400

# ---------------- Matches ----------------
@match_bp.route("/get_mutual_matches", methods=["GET"])
@jwt_required()
def get_mutual_matches():
    current_email = get_jwt_identity()
    service = MatchService(current_app.mongo.db)
    matches = service.get_mutual_matches(current_email, request)
    return jsonify({"logged_in_user": current_email, "matches": matches}), 200

# ---------------- Sent Requests ----------------
@match_bp.route('/sent_requests', methods=['GET'])
@jwt_required()
def sent_requests():
    current_email = get_jwt_identity()
    service = MatchService(current_app.mongo.db)
    sent = service.get_sent_requests(current_email, request)
    return jsonify({"sentRequests": sent}), 200

@match_bp.route("/sent_requests/cancel", methods=["POST"])
@jwt_required()
def cancel_sent_request():
    current_email = get_jwt_identity()
    data = request.get_json()
    target = data.get("target_email")

    if not target:
        return jsonify({"error": "Missing required fields"}), 400

    service = MatchService(current_app.mongo.db)
    success = service.cancel_sent_request(current_email, target)
    if success:
        return jsonify({"message": "Request cancelled"}), 200
    else:
        return jsonify({"error": "Request not found"}), 404


@match_bp.route("/recommended_users", methods=["GET"])
@jwt_required()
def recommended_users():
    try:
        current_email = get_jwt_identity()
        service = MatchService(current_app.mongo.db)
        results = service.get_recommended_users(current_email, request)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@match_bp.route("/people_near_you", methods=["GET"])
@jwt_required()
def people_near_you():
    current_email = get_jwt_identity()
    service = MatchService(current_app.mongo.db)
    results = service.get_people_near_you(current_email, request)
    return jsonify(results), 200
