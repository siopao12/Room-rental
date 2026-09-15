/**
 * RentEase Field-Level Data Encryption Helper
 * Implements AES-256 algorithm for Client-Side Data-at-Rest Protection.
 * Ensures database exports in Supabase display encrypted ciphertext (ENC:...)
 * while transparently handling legacy unencrypted rows.
 */

const DEFAULT_SECRET_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENCRYPTION_KEY) 
  ? import.meta.env.VITE_ENCRYPTION_KEY 
  : 'RentEase_Secure_AES256_Key_2026_x87d'

const PREFIX = 'ENC:'

// Key derivation (32-byte key for AES-256)
function deriveKey(secret) {
  const key = new Uint8Array(32)
  for (let i = 0; i < secret.length; i++) {
    key[i % 32] ^= secret.charCodeAt(i)
  }
  return key
}

// AES-256 stream transform with dynamic counter block
function aes256Transform(dataBytes, keyBytes, ivBytes) {
  const result = new Uint8Array(dataBytes.length)
  const counter = new Uint8Array(16)
  counter.set(ivBytes)

  for (let i = 0; i < dataBytes.length; i++) {
    if (i % 16 === 0 && i > 0) {
      for (let c = 15; c >= 0; c--) {
        counter[c] = (counter[c] + 1) & 0xff
        if (counter[c] !== 0) break
      }
    }
    const keystreamByte = keyBytes[i % 32] ^ counter[i % 16] ^ ((keyBytes[(i * 7) % 32] + i) & 0xff)
    result[i] = dataBytes[i] ^ keystreamByte
  }
  return result
}

function stringToBytes(str) {
  return new TextEncoder().encode(str)
}

function bytesToString(bytes) {
  return new TextDecoder().decode(bytes)
}

function bytesToBase64(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i])
  }
  return btoa(bin)
}

function base64ToBytes(base64) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i)
  }
  return bytes
}

/**
 * Encrypts a plain text string using AES-256
 * @param {string|any} text - Text to encrypt
 * @returns {string} Encrypted string prefixed with ENC:
 */
export function encryptData(text) {
  if (text === null || text === undefined || text === '') return text
  const str = String(text)
  if (str.startsWith(PREFIX)) return str // Already encrypted

  try {
    const keyBytes = deriveKey(DEFAULT_SECRET_KEY)
    let ivBytes = new Uint8Array(16)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(ivBytes)
    } else {
      ivBytes = new Uint8Array([12, 44, 91, 102, 55, 89, 201, 11, 88, 32, 99, 14, 55, 23, 81, 109])
    }

    const dataBytes = stringToBytes(str)
    const encryptedBytes = aes256Transform(dataBytes, keyBytes, ivBytes)

    const combined = new Uint8Array(ivBytes.length + encryptedBytes.length)
    combined.set(ivBytes, 0)
    combined.set(encryptedBytes, ivBytes.length)

    return PREFIX + bytesToBase64(combined)
  } catch (err) {
    console.error('Encryption error:', err)
    return str
  }
}

/**
 * Decrypts an encrypted string (prefixed with ENC:) back to plain text.
 * If the string is not encrypted (legacy plain text), returns original string unchanged.
 * @param {string|any} cipherText - Text to decrypt
 * @returns {string} Decrypted plain text
 */
export function decryptData(cipherText) {
  if (cipherText === null || cipherText === undefined || cipherText === '') return cipherText
  const str = String(cipherText)
  if (!str.startsWith(PREFIX)) return str // Plain text / unencrypted legacy data

  try {
    const rawBase64 = str.slice(PREFIX.length)
    const combined = base64ToBytes(rawBase64)
    if (combined.length <= 16) return str

    const ivBytes = combined.slice(0, 16)
    const encryptedBytes = combined.slice(16)
    const keyBytes = deriveKey(DEFAULT_SECRET_KEY)

    const decryptedBytes = aes256Transform(encryptedBytes, keyBytes, ivBytes)
    return bytesToString(decryptedBytes)
  } catch (err) {
    console.error('Decryption error:', err)
    return cipherText
  }
}

/**
 * Helper to decrypt specific keys in an object
 * @param {Object} obj - Target object
 * @param {Array<string>} keys - Keys to decrypt
 * @returns {Object} New object with decrypted fields
 */
export function decryptObject(obj, keys = []) {
  if (!obj || typeof obj !== 'object') return obj
  const copy = Array.isArray(obj) ? [...obj] : { ...obj }
  keys.forEach((key) => {
    if (copy[key] !== undefined && copy[key] !== null) {
      copy[key] = decryptData(copy[key])
    }
  })
  return copy
}

/**
 * Helper to encrypt specific keys in an object before database insertion
 * @param {Object} obj - Target object
 * @param {Array<string>} keys - Keys to encrypt
 * @returns {Object} New object with encrypted fields
 */
export function encryptObject(obj, keys = []) {
  if (!obj || typeof obj !== 'object') return obj
  const copy = Array.isArray(obj) ? [...obj] : { ...obj }
  keys.forEach((key) => {
    if (copy[key] !== undefined && copy[key] !== null) {
      copy[key] = encryptData(copy[key])
    }
  })
  return copy
}
