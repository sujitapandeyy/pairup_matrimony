from werkzeug.security import generate_password_hash
from models.user_model import UserModel
from models.user_detail_model import UserDetailModel

class RegisterService:
    def __init__(self, db):
        self.user_model = UserModel(db)
        self.detail_model = UserDetailModel(db)

    def register_user(self, data):
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        image_base64 = data.get('image')
        details = data.get('details')

        if not (name and email and password and image_base64 and details):
            return {'success': False, 'message': 'Missing required fields'}, 400

        if self.user_model.get_by_email(email):
            return {'success': False, 'message': 'Email already registered'}, 409

        hashed_password = generate_password_hash(password)
        user_doc = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'image': image_base64,
            'interests_completed': False,
        }

        user_result = self.user_model.create_user(user_doc)
        user_id = user_result.inserted_id

        details_doc = {
            'user_id': user_id,
            'age': int(details.get('age')),
            'gender': details.get('gender'),
            'religion': details.get('religion'),
            'location': details.get('location'),
            'latitude': float(details.get('latitude', 0.0)),
            'longitude': float(details.get('longitude', 0.0)),
            'height': details.get('height'),
            'marital_status': details.get('maritalStatus'),
            'education': details.get('education'),
            'profession': details.get('profession'),
            'personality': details.get('personality', []),
            'caption': details.get('caption', '')
        }

        self.detail_model.create_details(details_doc)

        return {'success': True, 'message': 'Registration successful'}, 200
