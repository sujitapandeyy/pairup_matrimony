
class UserDetailModel:
    def __init__(self, db):
        self.collection = db.user_details

    def create_details(self, details_doc):
        return self.collection.insert_one(details_doc)
