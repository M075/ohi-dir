// app/api/auth/forgot-password/route.js
//
// Step 1 of the password reset flow: issue a single-use token and email it.
//
// The response is deliberately identical whether or not the address belongs to
// an account. A different message for "no such user" turns this endpoint into
// an account enumeration oracle — an attacker can harvest which of a leaked
// address list are registered here, which is exactly the list they then try
// credential-stuffing against.

import connectDB from '@/config/database';
import User from '@/models/User';
import { getPublicBaseUrl } from '@/utils/brevo';
import { sendPasswordResetEmail, sendPasswordResetSocialEmail } from '@/utils/email';
import {
  generateResetToken,
  buildResetUrl,
  isWithinCooldown,
  RESET_TOKEN_TTL_MINUTES,
} from '@/utils/passwordReset';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

// The same answer for every outcome, so nothing about the account leaks.
const GENERIC_RESULT = {
  success: true,
  message:
    'If an account exists for that email address, a password reset link is on its way. Check your inbox and your spam folder.',
};

/**
 * Best-effort per-IP throttle.
 *
 * Deliberately in-memory: the project's Upstash limiter needs credentials that
 * aren't configured, and this must not be the thing that breaks a password
 * reset. Each serverless instance keeps its own counter, so this slows a
 * crude flood without pretending to be a real distributed rate limit — the
 * per-account cooldown below is the guarantee that actually holds.
 */
const ipHits = new Map();
const IP_WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_REQUESTS = 10;

function overIpLimit(ip) {
  if (!ip || ip === 'unknown') return false;

  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((at) => now - at < IP_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);

  // Keep the map from growing without bound on a long-lived instance.
  if (ipHits.size > 5000) {
    for (const [key, times] of ipHits) {
      if (!times.some((at) => now - at < IP_WINDOW_MS)) ipHits.delete(key);
    }
  }

  return hits.length > IP_MAX_REQUESTS;
}

export async function POST(request) {
  try {
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request format' }, 400);
    }

    const email = String(body?.email || '').toLowerCase().trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      // A malformed address is the one case worth reporting, since it tells the
      // user nothing about who is registered.
      return jsonResponse({ error: 'Please enter a valid email address' }, 400);
    }

    if (overIpLimit(clientIp)) {
      console.warn(`[forgot-password] throttled ${clientIp}`);
      return jsonResponse(
        { error: 'Too many reset requests. Please wait a few minutes and try again.' },
        429
      );
    }

    await connectDB();

    const user = await User.findOne({ email }).select(
      '+resetPasswordToken +resetPasswordExpires'
    );

    if (!user) {
      // No account: do nothing, say the same thing.
      console.log('[forgot-password] no account for requested address');
      return jsonResponse(GENERIC_RESULT);
    }

    // OAuth-only accounts have no password to reset. Issuing a token here would
    // *create* a password login path on an account that deliberately has none,
    // so instead we point the user back at their provider.
    if (user.authProvider && user.authProvider !== 'credentials') {
      await sendPasswordResetSocialEmail({
        email: user.email,
        storename: user.storename,
        provider: user.authProvider,
      });

      return jsonResponse(GENERIC_RESULT);
    }

    // A still-warm token means someone just asked. Don't mint another and
    // don't send another email — but answer exactly as if we had.
    if (isWithinCooldown(user.resetPasswordExpires)) {
      console.log(`[forgot-password] within cooldown for ${user._id}, not re-sending`);
      return jsonResponse(GENERIC_RESULT);
    }

    const { token, tokenHash, expiresAt } = generateResetToken();

    user.resetPasswordToken = tokenHash;
    user.resetPasswordExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    const result = await sendPasswordResetEmail({
      email: user.email,
      storename: user.storename,
      resetUrl: buildResetUrl(getPublicBaseUrl(), token),
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });

    // If the mail never left, the stored token is a liability with no upside:
    // it blocks the next attempt via the cooldown and stays valid for an hour.
    // Clear it so the user can simply try again.
    if (!result?.success) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error('[forgot-password] reset email could not be delivered');

      return jsonResponse(
        {
          error:
            'We could not send the reset email right now. Please try again in a few minutes.',
        },
        502
      );
    }

    return jsonResponse(GENERIC_RESULT);
  } catch (error) {
    console.error('Forgot password error:', error);
    return jsonResponse({ error: 'Something went wrong. Please try again.' }, 500);
  }
}
