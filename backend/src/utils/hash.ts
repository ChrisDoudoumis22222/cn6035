import crypto from 'crypto'

/**
 * Generate a random hex salt of given byte length.
 */
export function makeSalt(length: number = 16): string {
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compute a SHA-256 hex digest of the given text.
 */
export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

/**
 * Hash a password with a salt for storage
 */
export function hashPassword(password: string): { hash: string, salt: string } {
  const salt = makeSalt()
  const hash = sha256(password + salt)
  return { hash, salt }
}

/**
 * Verify a password against a stored hash and salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  return sha256(password + salt) === hash
}