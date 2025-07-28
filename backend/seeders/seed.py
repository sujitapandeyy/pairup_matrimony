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
        {"name":"Sujita Sharma","email":"sujita@gmail.com","password":"sujita123","details":{"age":"25","gender":"Female","religion":"Hindu","caste":"Brahmin","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'4\"","maritalStatus":"Single","education":"Bachelor's","profession":"Software Engineer","personality":"Balanced","hobbies":["Traveling","Music","Reading"],"caption":"Love exploring cultures"}},
        {"name":"Nikhil Thapa","email":"nikhil@gmail.com","password":"nikhil123","details":{"age":"28","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'8\"","maritalStatus":"Single","education":"Master's","profession":"Engineer","personality":"Social Butterfly","hobbies":["Fitness","Sports","Travel"],"caption":"Fitness enthusiast"}},
        {"name":"Nandita Gurung","email":"nandita@gmail.com","password":"nandita123","details":{"age":"26","gender":"Female","religion":"Buddhist","caste":"Gurung","location":"Dharan","latitude":"26.8146","longitude":"87.2797","height":"5'2\"","maritalStatus":"Single","education":"Bachelor's","profession":"Nurse","personality":"Homebody","hobbies":["Cooking","Gardening"],"caption":"Simple living"}},
        {"name":"Lav Rai","email":"lav@gmail.com","password":"lav123","details":{"age":"30","gender":"Male","religion":"Hindu","caste":"Rai","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'7\"","maritalStatus":"Single","education":"Master's","profession":"Banker","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Life learner"}},
        {"name":"Samriddhi Shrestha","email":"samriddhi@gmail.com","password":"samriddhi123","details":{"age":"27","gender":"Female","religion":"Hindu","caste":"Newar","location":"Bhaktapur","latitude":"27.6710","longitude":"85.4296","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Designer","personality":"Social Butterfly","hobbies":["Art","Photography"],"caption":"Creative soul"}},
        {"name":"Kush Singh","email":"kush@gmail.com","password":"kush123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Thakuri","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'9\"","maritalStatus":"Single","education":"PhD","profession":"Professor","personality":"Balanced","hobbies":["Reading","Writing"],"caption":"Knowledge seeker"}},
        {"name":"Sunita Tamang","email":"sunita@gmail.com","password":"sunita123","details":{"age":"24","gender":"Female","religion":"Buddhist","caste":"Tamang","location":"Hetauda","latitude":"27.4284","longitude":"85.0320","height":"5'1\"","maritalStatus":"Single","education":"Diploma","profession":"Designer","personality":"Social","hobbies":["Fashion","Dancing"],"caption":"Colorful life"}},
        {"name":"Nishan Basnet","email":"nishan@gmail.com","password":"nishan123","details":{"age":"31","gender":"Male","religion":"Hindu","caste":"Chhetri","location":"Butwal","latitude":"27.7006","longitude":"83.4484","height":"5'10\"","maritalStatus":"Single","education":"Master's","profession":"Business","personality":"Balanced","hobbies":["Tech","Travel"],"caption":"Entrepreneur"}},
        {"name":"Sabina Tharu","email":"sabina@gmail.com","password":"sabina123","details":{"age":"23","gender":"Female","religion":"Hindu","caste":"Tharu","location":"Nepalgunj","latitude":"28.0500","longitude":"81.6167","height":"5'0\"","maritalStatus":"Single","education":"Bachelor's","profession":"Social Worker","personality":"Social","hobbies":["Dancing","Volunteering"],"caption":"Help others"}},
        {"name":"Palsang Yadav","email":"palsang@gmail.com","password":"palsang123","details":{"age":"32","gender":"Male","religion":"Hindu","caste":"Madhesi","location":"Janakpur","latitude":"26.7271","longitude":"85.9407","height":"5'7\"","maritalStatus":"Single","education":"Bachelor's","profession":"Accountant","personality":"Homebody","hobbies":["Movies","Cooking"],"caption":"Simple dreams"}},
        {"name":"Pooja Shah","email":"pooja@gmail.com","password":"pooja123","details":{"age":"25","gender":"Female","religion":"Hindu","caste":"Brahmin","location":"Birgunj","latitude":"27.0000","longitude":"84.8667","height":"5'4\"","maritalStatus":"Single","education":"Bachelor's","profession":"Teacher","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Educator"}},
        {"name":"Binam Magar","email":"binam@gmail.com","password":"binam123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Magar","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'8\"","maritalStatus":"Single","education":"Bachelor's","profession":"Army","personality":"Balanced","hobbies":["Fitness","Sports"],"caption":"Disciplined"}},
        {"name":"Saraswati Limbu","email":"saraswati@gmail.com","password":"saraswati123","details":{"age":"26","gender":"Female","religion":"Hindu","caste":"Limbu","location":"Dharan","latitude":"26.8146","longitude":"87.2797","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Nurse","personality":"Social","hobbies":["Music","Dancing"],"caption":"Happy soul"}},
        {"name":"Kiran Sherpa","email":"kiran@gmail.com","password":"kiran123","details":{"age":"30","gender":"Male","religion":"Buddhist","caste":"Sherpa","location":"Solukhumbu","latitude":"27.7000","longitude":"86.7167","height":"5'7\"","maritalStatus":"Single","education":"High School","profession":"Guide","personality":"Balanced","hobbies":["Travel","Adventure"],"caption":"Mountain lover"}},
        {"name":"Bina Chaudhary","email":"bina@gmail.com","password":"bina123","details":{"age":"27","gender":"Female","religion":"Hindu","caste":"Tharu","location":"Chitwan","latitude":"27.5000","longitude":"84.3333","height":"5'2\"","maritalStatus":"Single","education":"Bachelor's","profession":"Tourism","personality":"Social","hobbies":["Travel","Photography"],"caption":"Explore Nepal"}},
        {"name":"Hari Poudel","email":"hari@gmail.com","password":"hari123","details":{"age":"33","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'9\"","maritalStatus":"Single","education":"Master's","profession":"Doctor","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Healer"}},
        {"name":"Gita Aryal","email":"gita@gmail.com","password":"gita123","details":{"age":"26","gender":"Female","religion":"Hindu","caste":"Brahmin","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'4\"","maritalStatus":"Single","education":"Bachelor's","profession":"Banker","personality":"Homebody","hobbies":["Cooking","Movies"],"caption":"Simple girl"}},
        {"name":"Rabin Thapa","email":"rabin@gmail.com","password":"rabin123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Chhetri","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'8\"","maritalStatus":"Single","education":"Bachelor's","profession":"IT","personality":"Balanced","hobbies":["Tech","Gaming"],"caption":"Tech geek"}},
        {"name":"Sita KC","email":"sita@gmail.com","password":"sita123","details":{"age":"24","gender":"Female","religion":"Hindu","caste":"Chhetri","location":"Nepalgunj","latitude":"28.0500","longitude":"81.6167","height":"5'3\"","maritalStatus":"Single","education":"Diploma","profession":"Nurse","personality":"Social","hobbies":["Dancing","Music"],"caption":"Enjoy life"}},
        {"name":"Bibek Joshi","email":"bibek@gmail.com","password":"bibek123","details":{"age":"31","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Dharan","latitude":"26.8146","longitude":"87.2797","height":"5'10\"","maritalStatus":"Single","education":"Master's","profession":"Engineer","personality":"Balanced","hobbies":["Reading","Travel"],"caption":"Thoughtful"}},
        {"name":"Rina Ghale","email":"rina@gmail.com","password":"rina123","details":{"age":"25","gender":"Female","religion":"Buddhist","caste":"Gurung","location":"Gorkha","latitude":"28.3333","longitude":"84.8333","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Banker","personality":"Social","hobbies":["Music","Travel"],"caption":"Adventure awaits"}},
        {"name":"Sagar Adhikari","email":"sagar@gmail.com","password":"sagar123","details":{"age":"30","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'9\"","maritalStatus":"Single","education":"Master's","profession":"Doctor","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Healing hands"}},
        {"name":"Pratima Karki","email":"pratima@gmail.com","password":"pratima123","details":{"age":"26","gender":"Female","religion":"Hindu","caste":"Karki","location":"Dharan","latitude":"26.8146","longitude":"87.2797","height":"5'2\"","maritalStatus":"Single","education":"Bachelor's","profession":"Nurse","personality":"Homebody","hobbies":["Cooking","Movies"],"caption":"Simple joys"}},
        {"name":"Deepak Bista","email":"deepak@gmail.com","password":"deepak123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Chhetri","location":"Nepalgunj","latitude":"28.0500","longitude":"81.6167","height":"5'8\"","maritalStatus":"Single","education":"Bachelor's","profession":"Engineer","personality":"Balanced","hobbies":["Tech","Gaming"],"caption":"Problem solver"}},
        {"name":"Anita Pariyar","email":"anita@gmail.com","password":"anita123","details":{"age":"24","gender":"Female","religion":"Hindu","caste":"Dalit","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'1\"","maritalStatus":"Single","education":"Diploma","profession":"Designer","personality":"Social","hobbies":["Art","Dancing"],"caption":"Creative mind"}},
        {"name":"Rajendra Limbu","email":"rajendra@gmail.com","password":"rajendra123","details":{"age":"32","gender":"Male","religion":"Hindu","caste":"Limbu","location":"Dharan","latitude":"26.8146","longitude":"87.2797","height":"5'7\"","maritalStatus":"Single","education":"Bachelor's","profession":"Army","personality":"Balanced","hobbies":["Fitness","Sports"],"caption":"Disciplined life"}},
        {"name":"Sangita Rai","email":"sangita@gmail.com","password":"sangita123","details":{"age":"27","gender":"Female","religion":"Hindu","caste":"Rai","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Teacher","personality":"Social","hobbies":["Music","Travel"],"caption":"Happy teacher"}},
        {"name":"Manish Rana","email":"manish@gmail.com","password":"manish123","details":{"age":"28","gender":"Male","religion":"Hindu","caste":"Magar","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'7\"","maritalStatus":"Single","education":"Bachelor's","profession":"Teacher","personality":"Balanced","hobbies":["Reading","Sports"],"caption":"Educate others"}},
        {"name":"Bishal Thapa","email":"bishal@gmail.com","password":"bishal123","details":{"age":"31","gender":"Male","religion":"Hindu","caste":"Chhetri","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'9\"","maritalStatus":"Single","education":"Master's","profession":"Business","personality":"Balanced","hobbies":["Reading","Travel"],"caption":"Business mind"}},
        # {"name":"Karuna Shrestha","email":"karuna@gmail.com","password":"karuna123","details":{"age":"26","gender":"Female","religion":"Hindu","caste":"Newar","location":"Bhaktapur","latitude":"27.6710","longitude":"85.4296","height":"5'2\"","maritalStatus":"Single","education":"Bachelor's","profession":"Banker","personality":"Homebody","hobbies":["Cooking","Movies"],"caption":"Simple life"}},
        # {"name":"Nabin Poudel","email":"nabin@gmail.com","password":"nabin123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'8\"","maritalStatus":"Single","education":"Master's","profession":"Doctor","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Medical professional"}},
        # {"name":"Sujana Gurung","email":"sujana@gmail.com","password":"sujana123","details":{"age":"25","gender":"Female","religion":"Buddhist","caste":"Gurung","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Nurse","personality":"Social","hobbies":["Music","Dancing"],"caption":"Caring soul"}},
        # {"name":"Rupak Tamang","email":"rupak@gmail.com","password":"rupak123","details":{"age":"28","gender":"Male","religion":"Buddhist","caste":"Tamang","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'7\"","maritalStatus":"Single","education":"Bachelor's","profession":"IT","personality":"Balanced","hobbies":["Tech","Gaming"],"caption":"Tech lover"}},
        # {"name":"Mina Magar","email":"mina@gmail.com","password":"mina123","details":{"age":"24","gender":"Female","religion":"Hindu","caste":"Magar","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'1\"","maritalStatus":"Single","education":"Diploma","profession":"Designer","personality":"Social","hobbies":["Art","Fashion"],"caption":"Creative designer"}},
        # {"name":"Santosh Khatri","email":"santosh@gmail.com","password":"santosh123","details":{"age":"30","gender":"Male","religion":"Hindu","caste":"Chhetri","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'9\"","maritalStatus":"Single","education":"Master's","profession":"Engineer","personality":"Balanced","hobbies":["Reading","Travel"],"caption":"World explorer"}},
        # {"name":"Prabina Thapa","email":"prabina@gmail.com","password":"prabina123","details":{"age":"26","gender":"Female","religion":"Hindu","caste":"Thapa","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'3\"","maritalStatus":"Single","education":"Bachelor's","profession":"Teacher","personality":"Social","hobbies":["Music","Travel"],"caption":"Happy teacher"}},
        # {"name":"Dinesh Bhandari","email":"dinesh@gmail.com","password":"dinesh123","details":{"age":"29","gender":"Male","religion":"Hindu","caste":"Newar","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'8\"","maritalStatus":"Single","education":"Bachelor's","profession":"Business","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Business owner"}},
        # {"name":"Sabina Koirala","email":"sabina2@gmail.com","password":"sabina2123","details":{"age":"25","gender":"Female","religion":"Hindu","caste":"Brahmin","location":"Pokhara","latitude":"28.2096","longitude":"83.9856","height":"5'2\"","maritalStatus":"Single","education":"Bachelor's","profession":"Banker","personality":"Homebody","hobbies":["Cooking","Movies"],"caption":"Simple living"}},
        # {"name":"Bikash Sharma","email":"bikash@gmail.com","password":"bikash123","details":{"age":"31","gender":"Male","religion":"Hindu","caste":"Brahmin","location":"Kathmandu","latitude":"27.7172","longitude":"85.3240","height":"5'9\"","maritalStatus":"Single","education":"Master's","profession":"Doctor","personality":"Balanced","hobbies":["Reading","Music"],"caption":"Medical professional"}},
    ]

    interests = [
        {"partner_age":"25-30","partner_gender":"Male","partner_height":"5'6\"-5'8\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Brahmin","partner_personality":"Balanced","partner_hobbies":["Travel","Music"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Engineer","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-28","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Travel","Fitness"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Buddhist","partner_caste":"Gurung","partner_personality":"Balanced","partner_hobbies":["Music","Cooking"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-30","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Reading","Music"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"28-35","partner_gender":"Male","partner_height":"5'6\"-5'11\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Newar","partner_personality":"Social","partner_hobbies":["Art","Photography"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Creative","partner_family_type":"Nuclear","partner_family_values":"Liberal","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Reading","Writing"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"26-32","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Buddhist","partner_caste":"Tamang","partner_personality":"Social","partner_hobbies":["Fashion","Dancing"],"partner_pets":"Love","partner_education":"Diploma","partner_profession":"Creative","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"23-28","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Tech","Travel"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"25-30","partner_gender":"Male","partner_height":"5'6\"-5'9\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Tharu","partner_personality":"Social","partner_hobbies":["Dancing","Volunteering"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Social","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-35","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Homebody","partner_hobbies":["Movies","Cooking"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"23-30","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Buddhist","partner_caste":"Gurung","partner_personality":"Social","partner_hobbies":["Music","Travel"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Brahmin","partner_personality":"Balanced","partner_hobbies":["Reading","Music"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"25-35","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Homebody","partner_hobbies":["Cooking","Movies"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"23-28","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Tech","Gaming"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"25-32","partner_gender":"Male","partner_height":"5'6\"-5'9\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Dalit","partner_personality":"Social","partner_hobbies":["Art","Dancing"],"partner_pets":"Love","partner_education":"Diploma","partner_profession":"Creative","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"23-28","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Limbu","partner_personality":"Balanced","partner_hobbies":["Fitness","Sports"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Rai","partner_personality":"Social","partner_hobbies":["Music","Travel"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-30","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Chhetri","partner_personality":"Balanced","partner_hobbies":["Reading","Travel"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-28","partner_gender":"Male","partner_height":"5'6\"-5'9\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Newar","partner_personality":"Homebody","partner_hobbies":["Cooking","Movies"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Brahmin","partner_personality":"Balanced","partner_hobbies":["Reading","Music"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-30","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Buddhist","partner_caste":"Gurung","partner_personality":"Social","partner_hobbies":["Music","Dancing"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Any","partner_personality":"Balanced","partner_hobbies":["Tech","Gaming"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-28","partner_gender":"Male","partner_height":"5'6\"-5'9\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Magar","partner_personality":"Social","partner_hobbies":["Art","Fashion"],"partner_pets":"Love","partner_education":"Diploma","partner_profession":"Creative","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Chhetri","partner_personality":"Balanced","partner_hobbies":["Reading","Travel"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-30","partner_gender":"Male","partner_height":"5'6\"-5'10\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Thapa","partner_personality":"Social","partner_hobbies":["Music","Travel"],"partner_pets":"Love","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Joint","partner_family_values":"Traditional","partner_living_pref":"Village","partner_long_distance":"Yes"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Newar","partner_personality":"Balanced","partner_hobbies":["Reading","Music"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"23-28","partner_gender":"Male","partner_height":"5'6\"-5'9\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Brahmin","partner_personality":"Homebody","partner_hobbies":["Cooking","Movies"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
        {"partner_age":"25-32","partner_gender":"Female","partner_height":"5'0\"-5'6\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Brahmin","partner_personality":"Balanced","partner_hobbies":["Reading","Music"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Any","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"Maybe"},
        {"partner_age":"26-32","partner_gender":"Female","partner_height":"5'0\"-5'5\"","partner_marital_status":"Single","partner_religion":"Hindu","partner_caste":"Magar","partner_personality":"Balanced","partner_hobbies":["Reading","Sports"],"partner_pets":"Neutral","partner_education":"Bachelor's","partner_profession":"Teacher","partner_family_type":"Nuclear","partner_family_values":"Moderate","partner_living_pref":"City","partner_long_distance":"No"},
    ]


    for admin in admins_to_seed:
        seed_user(admin)  

    for user, interest_data in zip(users_to_seed, interests):
        seed_user(user, interest_data)


if __name__ == "__main__":
    with app.app_context():
        seed_all()



     
  