// utils/fieldEncryption.js
//
// Authenticated encryption for individual database fields.
//
// Used for seller bank account numbers, which are held so payouts can be paid
// out and are otherwise never needed in the clear. Encrypting at rest means a
// leaked database dump or an over-broad projection does not hand out account
// numbers.
//
// Requires FIELD_ENCRYPTION_KEY: 32 bytes, hex encoded. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Losing the key means existing encrypted values cannot be recovered, so keep
// it with the same care as the database credentials themselves.

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';
const IV_BYTES = 12; // GCM standard

let cachedKey;

function getKey() {
  if (cachedKey !== undefined) return cachedKey;

  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    cachedKey = null;
    return cachedKey;
  }

  const key = Buffer.from(raw.trim(), 'hex');
  if (key.length !== 32) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY must be 32 bytes hex encoded (got ${key.length} bytes).`
    );
  }

  cachedKey = key;
  return cachedKey;
}

export function isEncryptionConfigured() {
  return getKey() !== null;
}

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a value for storage. Returns `enc:v1:<iv>:<tag>:<ciphertext>`, all
 * base64. Empty input passes through so optional fields stay empty rather
 * than becoming a ciphertext of "".
 *
 * Throws when no key is configured: silently writing plaintext would be worse
 * than failing, because nothing downstream would ever notice.
 */
export function encryptField(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }

  const value = String(plaintext);
  if (isEncrypted(value)) return value; // already encrypted, don't double-wrap

  const key = getKey();
  if (!key) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY is not set — refusing to store bank details in plain text.'
    );
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX + iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

/**
 * Decrypt a stored value.
 *
 * Values written before encryption was introduced are plain text and are
 * returned unchanged, so this is safe to deploy ahead of the backfill
 * migration. Run scripts/encrypt-bank-details.mjs to convert them.
 */
export function decryptField(stored) {
  if (!isEncrypted(stored)) return stored;

  const key = getKey();
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY is not set — cannot decrypt stored bank details.');
  }

  // Format: enc : v1 : <iv> : <tag> : <ciphertext>
  // Base64 never contains ':', so a plain split is unambiguous.
  const parts = stored.split(':');
  if (parts.length !== 5) {
    throw new Error('Stored value is not in the expected encrypted format.');
  }
  const [, , ivB64, tagB64, ciphertextB64] = parts;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Last-four-digits form for display. The UI never needs the full number —
 * only the payout export does.
 */
export function maskAccountNumber(accountNumber, visibleDigits = 4) {
  if (!accountNumber) return '';
  const value = String(accountNumber);
  if (value.length <= visibleDigits) return '•'.repeat(value.length);
  return `•••• ${value.slice(-visibleDigits)}`;
}
