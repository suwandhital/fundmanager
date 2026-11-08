/**
 * Cryptographic & validation utilities for secure local data storage
 */

export const uid = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

/**
 * Robust salted DJB2 hash matching the user's hashing algorithm
 */
export const hashPassword = (email: string, pass: string): string => {
  const str = email.trim().toLowerCase() + ':' + pass;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
};

export const sanitizeString = (str: string, maxLength: number = 100): string => {
  if (!str) return '';
  return str.trim().slice(0, maxLength);
};

export const sanitizeAmount = (amountInput: string | number): number | null => {
  const parsed = typeof amountInput === 'number' ? amountInput : parseFloat(amountInput);
  if (!isFinite(parsed) || isNaN(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
};

