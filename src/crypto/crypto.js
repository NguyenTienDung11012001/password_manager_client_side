// src/crypto/crypto.js

// --- Constants ---
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes
const PBKDF2_ITERATIONS = 310000; // Recommendation from OWASP for PBKDF2-HMAC-SHA256

/**
 * Derives a cryptographic key from a master password using PBKDF2.
 * @param {string} password - The master password.
 * @param {Uint8Array} salt - The salt for the key derivation.
 * @returns {Promise<CryptoKey>} - The derived AES-GCM key.
 */
async function deriveKey(password, salt) {
  const passwordBuffer = new TextEncoder().encode(password);
  
  // 1. Import the master password as a base key for PBKDF2.
  // This is a required step for the Web Crypto API. It does not mean we're using the password directly.
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  // 2. Derive the actual encryption key using PBKDF2.
  // This is the core of making the password "stronger" against brute-force attacks.
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 }, // Key properties for AES-GCM
    true, // The key is extractable (for debugging, can be set to false)
    ['encrypt', 'decrypt'] // Key can be used for both encrypting and decrypting
  );

  return derivedKey;
}

/**
 * Encrypts a data object and returns a base64 encoded string.
 * @param {object} data - The JSON object to encrypt (e.g., { items: [...] }).
 * @param {string} password - The master password.
 * @returns {Promise<string>} - A base64 string representing the encrypted data: salt + iv + ciphertext.
 */
export async function encrypt(data, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);

  const dataString = JSON.stringify(data);
  const dataBuffer = new TextEncoder().encode(dataString);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Combine salt, iv, and the encrypted data into a single buffer
  const combinedBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(salt, 0);
  combinedBuffer.set(iv, salt.length);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

  // Convert the combined buffer to a base64 string for easy storage in Gist
  return window.btoa(String.fromCharCode.apply(null, combinedBuffer));
}

/**
 * Decrypts a base64 encoded string.
 * @param {string} base64String - The base64 string from Gist (salt + iv + ciphertext).
 * @param {string} password - The master password.
 * @returns {Promise<object>} - The decrypted JSON object.
 */
export async function decrypt(base64String, password) {
  // Convert base64 back to a byte array
  const combinedBuffer = new Uint8Array(atob(base64String).split('').map(c => c.charCodeAt(0)));
  
  // Extract the salt, iv, and ciphertext from the combined buffer
  const salt = combinedBuffer.slice(0, SALT_LENGTH);
  const iv = combinedBuffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combinedBuffer.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (error) {
    // This error most likely means the password was incorrect, as decryption would fail.
    console.error('Decryption failed:', error);
    throw new Error('Could not decrypt data. The master password may be incorrect.');
  }
}
