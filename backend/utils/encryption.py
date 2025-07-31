from cryptography.fernet import Fernet

# You should save this key securely and load it from env or config
# For simplicity, generate once and reuse
FERNET_KEY = Fernet.generate_key()
fernet = Fernet(FERNET_KEY)

def encrypt_message(plain_text: str) -> str:
    """Encrypts a string message to base64 encoded cipher text."""
    encrypted_bytes = fernet.encrypt(plain_text.encode())
    return encrypted_bytes.decode()

def decrypt_message(encrypted_text: str) -> str:
    """Decrypts base64 encoded cipher text back to plain string."""
    decrypted_bytes = fernet.decrypt(encrypted_text.encode())
    return decrypted_bytes.decode()
