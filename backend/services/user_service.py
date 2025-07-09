from flask import current_app, jsonify

class UserService:
    def get_all_users(self):
        try:
            mongo = current_app.mongo
            users = list(mongo.db.users.find({}, {"_id": 0, "name": 1, "email": 1, "status": 1}))
            return jsonify(users), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def update_user_status(self, email, new_status):
        try:
            mongo = current_app.mongo
            if new_status not in ['active', 'blocked']:
                return jsonify({"error": "Invalid status"}), 400

            result = mongo.db.users.update_one({"email": email}, {"$set": {"status": new_status}})
            if result.matched_count == 0:
                return jsonify({"error": "User not found"}), 404

            return jsonify({"message": "Status updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
