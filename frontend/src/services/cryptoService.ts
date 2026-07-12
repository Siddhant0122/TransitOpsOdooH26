// Native Web Crypto API wrapper for AES-GCM encryption / decryption

// Helper to convert ArrayBuffer to Base64 string
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive a 256-bit AES-GCM CryptoKey from a user passphrase and salt (e.g. email)
export async function deriveEncryptionKey(passphrase: string, saltText: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const salt = enc.encode(saltText);
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false, // key is not exportable for security
    ["encrypt", "decrypt"]
  );
}

// Encrypt plain text using derived key, returns "ciphertext_base64:iv_base64"
export async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  if (!plaintext) return "";
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM
  
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    enc.encode(plaintext)
  );

  const ciphertextBase64 = arrayBufferToBase64(encryptedBuffer);
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  
  return `${ciphertextBase64}:${ivBase64}`;
}

// Decrypt ciphertext string ("ciphertext_base64:iv_base64") using derived key
export async function decryptText(encryptedValue: string, key: CryptoKey): Promise<string> {
  if (!encryptedValue || !encryptedValue.includes(":")) return encryptedValue; // fallback if unencrypted
  
  try {
    const parts = encryptedValue.split(":");
    const ciphertextBuffer = base64ToArrayBuffer(parts[0]);
    const ivBuffer = base64ToArrayBuffer(parts[1]);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(ivBuffer),
      },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed. The key might be incorrect.", error);
    return "[Decryption Failed - Check Passphrase]";
  }
}
