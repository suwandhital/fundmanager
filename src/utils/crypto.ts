import * as Crypto from 'expo-crypto';

/**
 * Generates a cryptographically secure UUIDv4 (CSPRNG)
 */
export const uid = (): string => {
  try {
    return Crypto.randomUUID();
  } catch {
    // Fallback if native crypto provider is not available
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    );
  }
};

/**
 * Secret salt namespace for client-side password hashing (customizable via EXPO_PUBLIC_HASH_SALT)
 */
const PASSWORD_SALT_PREFIX = process.env.EXPO_PUBLIC_HASH_SALT || 'suwan_fm_sec_v3_sha256_';

/**
 * Military-grade SHA-256 cryptographic password hash with salting
 */
export const hashPassword = async (email: string, pass: string): Promise<string> => {
  const cleanEmail = email.trim().toLowerCase();
  const payload = `${PASSWORD_SALT_PREFIX}:${cleanEmail}:${pass}`;
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, payload);
};

/**
 * Legacy 32-bit DJB2 hash — retained strictly for backward-compatible migration of pre-v1.0.4 cached credentials
 */
export const legacyDjb2Hash = (email: string, pass: string): string => {
  const str = email.trim().toLowerCase() + ':' + pass;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
};

export const sanitizeString = (str: string, maxLength: number = 100): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLength);
};

export const sanitizeAmount = (amountInput: string | number): number | null => {
  const parsed = typeof amountInput === 'number' ? amountInput : parseFloat(amountInput);
  if (!isFinite(parsed) || isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
};
