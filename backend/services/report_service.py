import os
import datetime
from werkzeug.utils import secure_filename

class ReportService:
    def __init__(self, mongo, upload_folder):
        self.mongo = mongo
        self.upload_folder = upload_folder
        os.makedirs(upload_folder, exist_ok=True)

    def create_report(self, reported_user_id, reason, proof_file=None):
        filename = None

        if proof_file:
            timestamp = datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')
            original_filename = secure_filename(proof_file.filename)
            filename = f"{timestamp}_{original_filename}"
            proof_path = os.path.join(self.upload_folder, filename)
            proof_file.save(proof_path)

        report_data = {
            'reported_user_id': reported_user_id,
            'reason': reason,
            'proof_filename': filename,
            'created_at': datetime.datetime.utcnow()
        }

        self.mongo.db.reports.insert_one(report_data)
