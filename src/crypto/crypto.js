// src/crypto/crypto.js

// --- Constants ---
const SALT_LENGTH = 16; // bytes
const IV_LENGTH = 12; // bytes
// FIX #6: tăng số vòng PBKDF2 (OWASP 2023 khuyến nghị >= 600k cho PBKDF2-HMAC-SHA256).
const PBKDF2_ITERATIONS = 600000;
// Số vòng cho "auth proof" — tách biệt với khóa mã hóa.
const AUTH_ITERATIONS = 200000;

// --- Helpers base64 <-> bytes ---
function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
}
function base64ToBytes(b64) {
  return new Uint8Array(atob(b64).split('').map((c) => c.charCodeAt(0)));
}

/**
 * Dẫn xuất khóa AES-GCM từ master password (dùng để mã hóa/giải mã dữ liệu).
 * @param {string} password
 * @param {Uint8Array} salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKey(password, salt) {
  const passwordBuffer = new TextEncoder().encode(password);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // FIX #4: không cho phép export khóa khỏi bộ nhớ.
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * FIX #2: Dẫn xuất "auth proof" từ master password + salt do server cấp.
 * Giá trị này được gửi cho server để CHỨNG MINH người dùng biết master password,
 * mà KHÔNG tiết lộ master password và KHÔNG trùng với khóa mã hóa (salt khác nhau).
 * @param {string} password - master password
 * @param {string} authSaltB64 - salt (base64) do server trả về
 * @returns {Promise<string>} - auth proof dạng base64
 */
export async function deriveAuthProof(password, authSaltB64) {
  const salt = base64ToBytes(authSaltB64);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: AUTH_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256
  );
  return bytesToBase64(new Uint8Array(bits));
}

/**
 * Mã hóa object -> chuỗi base64 (salt + iv + ciphertext).
 */
export async function encrypt(data, password) {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);

  const dataBuffer = new TextEncoder().encode(JSON.stringify(data));
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );

  const combinedBuffer = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(salt, 0);
  combinedBuffer.set(iv, salt.length);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

  return bytesToBase64(combinedBuffer);
}

/**
 * Giải mã chuỗi base64 -> object.
 */
export async function decrypt(base64String, password) {
  const combinedBuffer = base64ToBytes(base64String);

  const salt = combinedBuffer.slice(0, SALT_LENGTH);
  const iv = combinedBuffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combinedBuffer.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Could not decrypt data. The master password may be incorrect.');
  }
}
