from Crypto.PublicKey import ECC
from Crypto.Cipher import AES
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes
import base64
import json

def generate_ecdh_keypair():
    private_key = ECC.generate(curve='P-256')
    public_key = private_key.public_key().export_key(format='DER')
    return private_key, public_key

def load_public_key(pub_bytes):
    return ECC.import_key(pub_bytes)

def derive_shared_key(private_key, peer_public_bytes):
    peer_key = ECC.import_key(peer_public_bytes)
    shared_secret = private_key.d * peer_key.pointQ
    shared_secret_bytes = int(shared_secret.x).to_bytes(32, 'big')
    return SHA256.new(shared_secret_bytes).digest()  # 256-bit AES key

def encrypt_message_aes_gcm(aes_key, plaintext):
    nonce = get_random_bytes(12)
    cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
    payload = {
        'nonce': base64.b64encode(nonce).decode(),
        'ciphertext': base64.b64encode(ciphertext).decode(),
        'tag': base64.b64encode(tag).decode()
    }
    return json.dumps(payload)

def decrypt_message_aes_gcm(aes_key, json_payload):
    try:
        payload = json.loads(json_payload)
        nonce = base64.b64decode(payload['nonce'])
        ciphertext = base64.b64decode(payload['ciphertext'])
        tag = base64.b64decode(payload['tag'])

        cipher = AES.new(aes_key, AES.MODE_GCM, nonce=nonce)
        plaintext = cipher.decrypt_and_verify(ciphertext, tag)
        return plaintext.decode()
    except Exception as e:
        print("Decryption failed:", str(e))
        return "[decryption error]"