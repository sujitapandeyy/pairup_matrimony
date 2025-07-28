import sys
import os
from werkzeug.security import generate_password_hash

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from flask import Flask
from flask_pymongo import PyMongo
from services.register_service import RegisterService
from services.interest_service import InterestService

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/pairup_db"

mongo = PyMongo(app)
app.mongo = mongo  


def seed_user(data, interest_data=None):
    db = app.mongo.db
    register_service = RegisterService(db)
    interest_service = InterestService(db)

    print(f"Seeding user: {data['email']}")

    if 'role' not in data:
        data['role'] = 'user'

    if data['role'] == 'admin':
        existing = db.users.find_one({'email': data['email']})
        if existing:
            print(f"Admin user {data['email']} already exists. Skipping.")
            return

        admin_doc = {
            'name': data['name'],
            'email': data['email'],
            'password': generate_password_hash(data['password']),
            'role': 'admin',
            'status': 'active',
            'interests_completed': True,  
            'photo': data.get('photo', '/img/defaultadmin.jpg'), 
        }
        db.users.insert_one(admin_doc)
        print(f"Seeded admin user: {data['email']}")
        return

    result, status = register_service.register_user(data)
    print(f"  Register status: {status}, message: {result['message']}")

    if status == 200 and interest_data:
        result, status = interest_service.save_interests(data["email"], interest_data)
        print(f"  Interests status: {status}, message: {result['message']}")

    print()


def seed_all():
    admins_to_seed = [
        {
            "name": "Super Admin",
            "email": "admin@example.com",
            "password": "admin123",
            "role": "admin",
            "photo": "/img/defaultadmin.jpg", 
        },
    ]

    users_to_seed = [
          {
    "name": "Sujita Sharma",
    "email": "sujita.sharma@example.com",
    "password": "hashed_password_here",
    "details": {
      "age": "25",
      "gender": "Female",
      "religion": "Hindu",
      "caste": "Brahmin",
      "location": "Kathmandu, Nepal",
      "latitude": "27.7172",
      "longitude": "85.3240",
      "height": "5'4\"",
      "maritalStatus": "Single",
      "education": "Bachelor's",
      "profession": "Software Engineer",
      "personality": "Balanced",
      "interest": ["Traveling", "Music", "Reading", "Photography"],
      "caption": "Love exploring new cultures and books."
    }
        
}
  ]


    interests = [
{
     "partner_age": "25-30",
    "partner_gender": "Male",
    "partner_height": "5'6\" - 5'8\"",
    "partner_marital_status": "Single",
    "partner_religion": "Hindu",
    "partner_caste": "Brahmin",
    "partner_personality": "Balanced",
    "partner_hobbies": ["Traveling", "Fitness", "Music"],
    "partner_pets": "Love Them",
    "partner_education": "Bachelor's",
    "partner_profession": "Engineer",
    "partner_family_type": "Nuclear",
    "partner_family_values": "Moderate",
    "partner_living_pref": "City",
    "partner_long_distance": "Maybe"
}          ]


    for admin in admins_to_seed:
        seed_user(admin)  

    for user, interest_data in zip(users_to_seed, interests):
        seed_user(user, interest_data)


if __name__ == "__main__":
    with app.app_context():
        seed_all()



     
  