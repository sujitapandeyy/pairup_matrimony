import os
from datetime import datetime
from werkzeug.utils import secure_filename

class ReportService:
    def __init__(self, mongo, upload_folder):
        self.mongo = mongo
        self.upload_folder = upload_folder
        os.makedirs(upload_folder, exist_ok=True)

    def create_report(self, reported_user_id, reason, proof_file=None):
        filename = None

        if proof_file:
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            filename = f"{timestamp}_{secure_filename(proof_file.filename)}"
            proof_file.save(os.path.join(self.upload_folder, filename))

        report_data = {
            'reported_user_id': reported_user_id,
            'reason': reason,
            'proof_filename': filename,
            'created_at': datetime.now()
        }

        self.mongo.db.reports.insert_one(report_data)
