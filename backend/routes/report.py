from flask import Blueprint, request, jsonify, current_app
from services.report_service import ReportService

report_bp = Blueprint('report', __name__, url_prefix='/api')

@report_bp.route('/report', methods=['POST'])
def report_user():
    try:
        reported_user_id = request.form.get('reportedUserId')
        reason = request.form.get('reason')
        proof = request.files.get('proof')

        if not reported_user_id or not reason:
            return jsonify({'message': 'reportedUserId and reason are required.'}), 400

        report_service = ReportService(current_app.mongo, current_app.config['UPLOAD_FOLDER'])
        report_service.create_report(reported_user_id, reason, proof)

        return jsonify({'message': 'Report submitted successfully.'}), 200

    except Exception as e:
        print("Report error:", e)
        return jsonify({'message': 'Internal server error'}), 500


@report_bp.route('/reports', methods=['GET'])
def get_reports():
    try:
        mongo = current_app.mongo

        user_map = {
            str(u["_id"]): u.get("email", "unknown@email.com")
            for u in mongo.db.users.find({}, {"email": 1})
        }

        reports = list(mongo.db.reports.find().sort('created_at', -1))

        result = [
            {
                "id": str(r["_id"]),
                "reported_user": user_map.get(str(r["reported_user_id"]), str(r["reported_user_id"])),
                "reason": r["reason"],
                "proof": r.get("proof_filename"),
                "created_at": r["created_at"].isoformat()
            }
            for r in reports
        ]

        return jsonify(result), 200

    except Exception as e:
        print("Error getting reports:", e)
        return jsonify([]), 500
