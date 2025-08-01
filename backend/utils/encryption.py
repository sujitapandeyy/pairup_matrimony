import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()  # Load .env if present

FERNET_KEY = os.getenv("FERNET_KEY")

if not FERNET_KEY:
    raise ValueError("FERNET_KEY is not set. Add it to your environment or .env file.")

fernet = Fernet(FERNET_KEY.encode())

def encrypt_message(plain_text: str) -> str:
    return fernet.encrypt(plain_text.encode()).decode()

def decrypt_message(encrypted_text: str) -> str:
    return fernet.decrypt(encrypted_text.encode()).decode()
