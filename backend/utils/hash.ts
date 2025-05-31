// utils/hash.ts
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';

/**
 * Generate a random hex salt of given byte length.
 */
export async function makeSalt(length: number = 16): Promise<string> {
  const bytes = await Random.getRandomBytesAsync(length);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute a SHA-256 hex digest of the given text.
 */
export async function sha256(text: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    text
  );
}
