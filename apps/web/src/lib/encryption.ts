import nacl from 'tweetnacl'
import util from 'tweetnacl-util'

const { encodeUTF8, decodeUTF8, encodeBase64, decodeBase64 } = util

// Derive a 32-byte encryption key from master password + salt
// PBKDF2 with 100,000 iterations — slow by design, makes brute force expensive
export async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  )
  return new Uint8Array(bits)
}

// Encrypt a string value with a derived key
// Returns { encryptedData, iv, salt } — all base64 encoded for DB storage
export async function encryptCredential(
  plaintext: string,
  masterPassword: string
): Promise<{ encryptedData: string; iv: string; salt: string }> {
  const salt = nacl.randomBytes(16)
  const key = await deriveKey(masterPassword, salt)

  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength) // 24 bytes
  const messageUint8 = decodeUTF8(plaintext)
  const encrypted = nacl.secretbox(messageUint8, nonce, key)

  return {
    encryptedData: encodeBase64(encrypted),
    iv: encodeBase64(nonce),
    salt: encodeBase64(salt),
  }
}

// Decrypt — returns null if password is wrong (instead of throwing)
export async function decryptCredential(
  encryptedData: string,
  iv: string,
  salt: string,
  masterPassword: string
): Promise<string | null> {
  try {
    const key = await deriveKey(masterPassword, decodeBase64(salt))
    const decrypted = nacl.secretbox.open(
      decodeBase64(encryptedData),
      decodeBase64(iv),
      key
    )
    if (!decrypted) return null // wrong password
    return encodeUTF8(decrypted)
  } catch {
    return null
  }
}

// Hash master password for verification (stored on User, never the password itself)
// Uses SHA-256 — just for "is this the right password" check, not for encryption
export async function hashMasterPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Verify master password against stored hash
export async function verifyMasterPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const hash = await hashMasterPassword(password)
  return hash === storedHash
}