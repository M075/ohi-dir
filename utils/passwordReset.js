// utils/passwordReset.js
//
// Token handling for the forgot-password flow, shared by the request and the
// reset routes so both agree on the format, the lifetime and the hashing.
//
// The raw token only ever exists in the email. What is stored on the User
// document is its SHA-256 hash: a reset token is a bearer credential, so a
// leaked database dump (or an accidentally over-broad API projection) must not
// hand an attacker the ability to take over accounts. Comparing hashes costs
// nothing because we look the user up *by* the hash.

import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/** How long a reset link stays usable. Short enough to limit exposure. */
export const RESET_TOKEN_TTL_MINUTES = 60;

/**
 * Minimum gap between reset emails for the same account.
 *
 * Without this, the endpoint is a free mail cannon: anyone can point it at
 * someone else's address and flood their inbox.
 */
export const RESET_REQUEST_COOLDOWN_SECONDS = 90;

/** Enforced on the new password. Matches the stricter of the two signup routes. */
export const MIN_PASSWORD_LENGTH = 8;

/** 32 bytes of CSPRNG output — 256 bits, not guessable. */
export function generateResetToken() {
  const token = randomBytes(32).toString('hex');

  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  };
}

export function hashResetToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Constant-time comparison of two hex hashes.
 *
 * Lookups are by hash so this isn't on the critical path, but it is used to
 * re-check the match after the query and keeps the comparison free of the
 * early-exit behaviour of `===`.
 */
export function hashesMatch(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

/**
 * True while a previously issued token is still inside its cooldown window.
 *
 * Derived from the stored expiry rather than a separate "issuedAt" field:
 * issuedAt is always expiresAt minus the TTL, so there is nothing to add to
 * the schema.
 */
export function isWithinCooldown(expiresAt) {
  if (!expiresAt) return false;

  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) return false;

  const issuedAt = expires.getTime() - RESET_TOKEN_TTL_MINUTES * 60 * 1000;
  return Date.now() - issuedAt < RESET_REQUEST_COOLDOWN_SECONDS * 1000;
}

/** The link that goes in the email. */
export function buildResetUrl(baseUrl, token) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  return `${base}/auth/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Validate a candidate password, returning an error string or null.
 *
 * Deliberately length-only beyond the obvious: composition rules (one upper,
 * one symbol…) push people towards predictable substitutions without adding
 * much real entropy.
 */
export function validateNewPassword(password) {
  if (typeof password !== 'string' || !password) {
    return 'Please enter a new password';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (password.length > 200) {
    return 'Password is too long';
  }

  return null;
}
