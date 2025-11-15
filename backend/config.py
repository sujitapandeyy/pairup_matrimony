import os
from dotenv import load_dotenv
from datetime import timedelta

# Load .env file variables if present
load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-secret-key')
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/pairup')
    
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER')
    if not UPLOAD_FOLDER:
        UPLOAD_FOLDER = os.path.join(basedir, '..', 'uploads')
    else:
        UPLOAD_FOLDER = os.path.abspath(UPLOAD_FOLDER)

