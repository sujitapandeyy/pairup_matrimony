from werkzeug.security import check_password_hash

class LoginService:
    def __init__(self, db):
        self.users = db.users

    def login_user(self, email, password, session):
        if not email or not password:
            return {'success': False, 'message': 'Email and password required'}, 400

        user = self.users.find_one({'email': email})
        if not user or not check_password_hash(user['password'], password):
            return {'success': False, 'message': 'Invalid email or password'}, 401

        session['user_email'] = user['email']
        session['user_name'] = user['name']
        session['user_id'] = str(user['_id'])

        interests_completed = user.get('interests_completed', False)

        return {
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': str(user['_id']),
                'name': user['name'],
                'email': user['email'],
                'interests_completed': interests_completed
            }
        }, 200
