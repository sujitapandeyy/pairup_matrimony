import { x25519 } from '@noble/curves/ed25519';
import { bytesToHex, hexToBytes } from '@noble/curves/abstract/utils';
import { gcm } from '@noble/ciphers/aes';

export class EncryptionService {
  private privateKey: Uint8Array;
  public publicKey: Uint8Array;
  private sharedSecrets: Record<string, Uint8Array> = {};

  constructor() {
    // Generate key pair
    this.privateKey = x25519.utils.randomPrivateKey();
    this.publicKey = x25519.getPublicKey(this.privateKey);
  }

  getPublicKeyHex(): string {
    return bytesToHex(this.publicKey);
  }

  deriveSharedSecret(peerPublicKeyHex: string): Uint8Array {
    const peerPublicKey = hexToBytes(peerPublicKeyHex);
    return x25519.getSharedSecret(this.privateKey, peerPublicKey);
  }

  async encryptMessage(sharedSecret: Uint8Array, message: string): Promise<{ ciphertext: string; nonce: string }> {
    try {
      // Derive AES key using HKDF
      const aesKey = await this.deriveAesKey(sharedSecret);
      
      // Generate random nonce
      const nonce = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt with AES-GCM
      const ciphertext = gcm(aesKey, nonce).encrypt(new TextEncoder().encode(message));
      
      return {
        ciphertext: bytesToHex(ciphertext),
        nonce: bytesToHex(nonce)
      };
    } catch (err) {
      console.error('Encryption error:', err);
      throw new Error('Failed to encrypt message');
    }
  }

  async decryptMessage(sharedSecret: Uint8Array, ciphertextHex: string, nonceHex: string): Promise<string> {
    try {
      // Derive AES key using HKDF
      const aesKey = await this.deriveAesKey(sharedSecret);
      
      const ciphertext = hexToBytes(ciphertextHex);
      const nonce = hexToBytes(nonceHex);
      
      // Decrypt with AES-GCM
      const plaintext = gcm(aesKey, nonce).decrypt(ciphertext);
      
      return new TextDecoder().decode(plaintext);
    } catch (err) {
      console.error('Decryption error:', err);
      throw new Error('Failed to decrypt message');
    }
  }

  private async deriveAesKey(sharedSecret: Uint8Array): Promise<Uint8Array> {
    // Use HKDF to derive a 256-bit AES key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'HKDF' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(0),
        info: new TextEncoder().encode('Chat-App-Key-Derivation')
      },
      keyMaterial,
      256
    );
    
    return new Uint8Array(derivedBits);
  }
}