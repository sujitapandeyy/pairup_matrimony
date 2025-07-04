class UserModel:
    def __init__(self, db):
        self.collection = db.users

    def get_by_email(self, email):
        return self.collection.find_one({'email': email})

    def create_user(self, user_doc):
        return self.collection.insert_one(user_doc)