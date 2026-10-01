// app/api/auth/reset-password/route.js
//
// Step 2 of the password reset flow.
//
//   GET  ?token=…   is the link valid? (so the page can show an error before
//                   the user types a new password into a dead form)
//   POST            consume the token and set the new password
//
// Unlike the request endpoint, this one reports failures plainly. There is
// nothing to enumerate here: the token is a 256-bit secret, so "invalid or
// expired" tells an attacker only what they already know.

import connectDB from '@/config/database';
import User from '@/models/User';
import { sendPasswordChangedEmail } from '@/utils/email';
import {
  hashResetToken,
  hashesMatch,
  validateNewPassword,
  MIN_PASSWORD_LENGTH,
} from '@/utils/passwordReset';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });

/**
 * Look up the account holding this token.
 *
 * The expiry is part of the query, so an expired token simply matches nothing —
 * there is no window where a stale token is found and then rejected by a later
 * branch that someone could forget to write.
 */
async function findUserByToken(rawToken) {
  const tokenHash = hashResetToken(rawToken);

  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +password');

  if (!user) return null;

  // Belt and braces: confirm the match in constant time as well.
  return hashesMatch(user.resetPasswordToken, tokenHash) ? user : null;
}

export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token');

    if (!token || typeof token !== 'string' || token.length < 32) {
      return jsonResponse({ valid: false, error: 'This reset link is not valid.' }, 400);
    }

    await connectDB();
    const user = await findUserByToken(token);

    if (!user) {
      return jsonResponse(
        {
          valid: false,
          error: 'This reset link has expired or has already been used. Please request a new one.',
        },
        400
      );
    }

    // Echo the address so the form can show whose password is being changed —
    // useful when someone has several accounts, and it reveals nothing the
    // holder of the token doesn't already have.
    return jsonResponse({ valid: true, email: user.email, minLength: MIN_PASSWORD_LENGTH });
  } catch (error) {
    console.error('Reset token check error:', error);
    return jsonResponse({ valid: false, error: 'Could not verify this link.' }, 500);
  }
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request format' }, 400);
    }

    const { token, password } = body || {};

    if (!token || typeof token !== 'string') {
      return jsonResponse({ error: 'This reset link is not valid.' }, 400);
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) {
      return jsonResponse({ error: passwordError }, 400);
    }

    await connectDB();
    const user = await findUserByToken(token);

    if (!user) {
      return jsonResponse(
        {
          error: 'This reset link has expired or has already been used. Please request a new one.',
        },
        400
      );
    }

    // The model's pre-save hook hashes this with bcrypt — assigning the plain
    // value here is correct, and hashing it first would double-hash it.
    user.password = password;

    // Single use: clearing the token before the save means a replayed request
    // (double-clicked button, retried fetch) finds nothing to match.
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Completing this flow proves control of the mailbox, which is exactly what
    // email verification is asking for.
    if (!user.isEmailVerified) {
      user.isEmailVerified = true;
    }

    // Only legacy documents with no authProvider at all are adjusted. A Google
    // or Facebook account must never be converted to credentials here — the
    // request endpoint refuses to issue tokens for those precisely so that this
    // flow can't be used to bolt a password onto a social login.
    if (!user.authProvider) {
      user.authProvider = 'credentials';
    }

    // Validation is skipped deliberately. Schema rules have tightened over
    // time (the province enum, the 4-digit zipCode check), so an older
    // document can hold a value that no longer validates — and that must not
    // be what locks someone out of resetting their password. The one field
    // this route actually writes is checked above by validateNewPassword, and
    // the model's pre-save hooks (including the bcrypt hash) still run.
    await user.save({ validateBeforeSave: false });

    // Confirmation doubles as a breach alarm: if the account holder didn't do
    // this, this email is how they find out.
    await sendPasswordChangedEmail({
      email: user.email,
      storename: user.storename,
    });

    return jsonResponse({
      success: true,
      message: 'Your password has been updated. You can now sign in.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return jsonResponse({ error: 'Could not update your password. Please try again.' }, 500);
  }
}
