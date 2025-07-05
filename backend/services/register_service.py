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
        details = data.get('details')

        if not all([name, email, password, details]):
            return {'success': False, 'message': 'Missing required fields'}, 400

        if self.user_model.get_by_email(email):
            return {'success': False, 'message': 'Email already registered'}, 409

        try:
            age = int(details.get('age'))
            if age < 18:
                return {'success': False, 'message': 'Age must be 18 or older'}, 400
            latitude = float(details.get('latitude'))
            longitude = float(details.get('longitude'))
        except (TypeError, ValueError):
            return {'success': False, 'message': 'Invalid numeric field values'}, 400

        required_fields = [
            details.get('gender'),
            details.get('religion'),
            details.get('location'),
            details.get('maritalStatus'),
            details.get('education'),
            details.get('profession'),
        ]
        if any(not field for field in required_fields):
            return {'success': False, 'message': 'Missing required personal details'}, 400

        # Assign default profile image based on gender
        gender = details.get('gender')
        if gender == 'Female':
            profile_image_url = '/img/defaultgirl.jpg'
        else:
            profile_image_url = '/img/defaultboy.jpg'

        hashed_password = generate_password_hash(password)
        user_doc = {
            'name': name,
            'email': email,
            'password': hashed_password,
            'photo': profile_image_url, 
            'interests_completed': False,
        }

        try:
            user_result = self.user_model.create_user(user_doc)
            user_id = user_result.inserted_id

            details_doc = {
                'user_id': user_id,
                'age': age,
                'gender': gender,
                'religion': details.get('religion'),
                'location': details.get('location'),
                'latitude': latitude,
                'longitude': longitude,
                'height': details.get('height'),
                'marital_status': details.get('maritalStatus'),
                'education': details.get('education'),
                'profession': details.get('profession'),
                'personality': details.get('personality', []),
                'caption': details.get('caption', '')
            }

            self.detail_model.create_details(details_doc)

            return {'success': True, 'message': 'Registration successful'}, 200

        except Exception as e:
            print(f"Error during registration: {e}")
            return {'success': False, 'message': 'Server error'}, 500
