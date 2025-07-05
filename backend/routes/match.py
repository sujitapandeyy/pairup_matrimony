from flask import Blueprint, request, jsonify, current_app
from services.match_service import MatchService
from bson.errors import InvalidId

match_bp = Blueprint("match_bp", __name__)

@match_bp.route("/get_profiles", methods=["GET"])
def get_profiles():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400
    service = MatchService(current_app.mongo.db)
    profiles = service.get_profiles(request, email)
    return jsonify(profiles), 200

@match_bp.route("/swipe", methods=["POST"])
def swipe():
    data = request.get_json()
    swiper = data.get("swiper_email")
    target = data.get("target_email")
    liked = data.get("liked")

    if not swiper or not target or liked is None:
        return jsonify({"error": "Missing fields"}), 400

    service = MatchService(current_app.mongo.db)
    result = service.swipe(swiper, target, liked)
    return jsonify(result), 200

@match_bp.route("/notifications", methods=["GET"])
def get_notifications():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400
    service = MatchService(current_app.mongo.db)
    notes = service.get_notifications(email, request)
    return jsonify(notes), 200

@match_bp.route("/notifications/read", methods=["POST"])
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
def ignore(notification_id):
    try:
        service = MatchService(current_app.mongo.db)
        success = service.ignore(notification_id)
        if not success:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"message": "Ignored"}), 200
    except InvalidId:
        return jsonify({"error": "Invalid ID"}), 400

@match_bp.route("/get_mutual_matches", methods=["GET"])
def get_mutual_matches():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Missing email"}), 400
    service = MatchService(current_app.mongo.db)
    matches = service.get_mutual_matches(email, request)
    return jsonify({"logged_in_user": email, "matches": matches}), 200
