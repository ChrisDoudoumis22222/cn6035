import * as Crypto from "expo-crypto"
import * as Random from "expo-random"

/**
 * Generate a random hex salt of given byte length.
 */
export async function makeSalt(length = 16): Promise<string> {
  const bytes = await Random.getRandomBytesAsync(length)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Compute a SHA-256 hex digest of the given text with optional salt.
 * If salt is provided, it will be appended to the text before hashing.
 */
export async function sha256(text: string, salt = ""): Promise<string> {
  const dataToHash = text + salt
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, dataToHash)
}

/**
 * Hash a password with a random salt.
 * Returns both the hash and the salt for storage.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = await makeSalt()
  const hash = await sha256(password, salt)
  return { hash, salt }
}

/**
 * Verify a password against a stored hash and salt.
 * Returns true if the password matches, false otherwise.
 */
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  const computedHash = await sha256(password, salt)
  return computedHash === storedHash
}
