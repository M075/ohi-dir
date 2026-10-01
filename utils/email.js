// utils/email.js
//
// The only module routes should import to send mail.
//
// Every function here is "safe": it resolves rather than throwing, so a Brevo
// outage, a missing API key or a buyer with a typo'd address can never fail a
// checkout, a status update or a payout. Callers get a result object back if
// they care, and can ignore it if they don't.
//
// Sends are awaited rather than left as floating promises. On Vercel the
// function instance is frozen as soon as the response is returned, so a
// promise that hasn't settled by then is silently dropped — "fire and forget"
// here means "never sent". Where several emails belong to one event they go out
// concurrently via Promise.allSettled, so the wait is one round trip, not N.

import { sendTransactionalEmail } from '@/utils/brevo';
import * as templates from '@/utils/emailTemplates';

/**
 * Deliver a rendered template, swallowing every failure.
 *
 * `label` is only used for log lines — it makes a failed send traceable to the
 * event that triggered it without having to guess from the subject.
 */
async function safeSend(label, { to, template, replyTo, cc, bcc }) {
  try {
    if (!to) {
      console.warn(`[email] ${label}: no recipient, skipped`);
      return { success: false, skipped: true, reason: 'no-recipient' };
    }

    const result = await sendTransactionalEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: template.tags,
      replyTo,
      cc,
      bcc,
    });

    if (!result.success && !result.skipped) {
      console.error(`[email] ${label}: send failed — ${result.error}`);
    }

    return result;
  } catch (error) {
    // Template rendering itself can throw on an unexpectedly shaped document.
    // That must not take the caller down either.
    console.error(`[email] ${label}: unexpected error — ${error.message}`);
    return { success: false, error: error.message };
  }
}

/** Admin notification addresses, from the same env var the User model uses. */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
    .filter((entry) => entry.includes('@'));
}

/**
 * Lazily resolve a user's email + store name.
 *
 * Order documents reach these helpers in wildly different states: the PayFast
 * ITN handler holds raw ObjectId refs, the status route populates them, and the
 * expiry sweep has neither. Rather than force every call site to populate
 * correctly, resolve whatever is missing here — and only when it is missing, so
 * an already-populated document costs no query.
 */
async function resolveUser(ref) {
  if (!ref) return null;

  // Already populated (or a plain object carrying what we need).
  if (typeof ref === 'object' && (ref.email || ref.storename)) {
    return { email: ref.email, storename: ref.storename };
  }

  try {
    const [{ default: connectDB }, { default: User }] = await Promise.all([
      import('@/config/database'),
      import('@/models/User'),
    ]);

    await connectDB();
    const user = await User.findById(ref).select('email storename').lean();
    return user ? { email: user.email, storename: user.storename } : null;
  } catch (error) {
    console.error(`[email] failed to resolve user ${ref}: ${error.message}`);
    return null;
  }
}

function buyerAddress(order) {
  return order?.buyerEmail || order?.shippingAddress?.email || null;
}

async function sellerAddress(order) {
  if (order?.seller?.email) return order.seller.email;
  const seller = await resolveUser(order?.seller);
  return seller?.email || null;
}

// ---------------------------------------------------------------------------
// Account & authentication
// ---------------------------------------------------------------------------

export function sendWelcomeEmail({ email, storename, role = 'buyer' }) {
  return safeSend('welcome', {
    to: email,
    template: templates.welcomeEmail({ storename, role }),
  });
}

export function sendSellerUpgradeEmail({ email, storename }) {
  return safeSend('seller-upgrade', {
    to: email,
    template: templates.sellerUpgradeEmail({ storename }),
  });
}

export function sendPasswordResetEmail({ email, storename, resetUrl, expiresInMinutes = 60 }) {
  return safeSend('password-reset', {
    to: email,
    template: templates.passwordResetEmail({ storename, resetUrl, expiresInMinutes }),
  });
}

export function sendPasswordResetSocialEmail({ email, storename, provider }) {
  return safeSend('password-reset-social', {
    to: email,
    template: templates.passwordResetSocialEmail({ storename, provider }),
  });
}

export function sendPasswordChangedEmail({ email, storename }) {
  return safeSend('password-changed', {
    to: email,
    template: templates.passwordChangedEmail({ storename }),
  });
}

export function sendAccountSuspendedEmail({ email, storename, reason }) {
  return safeSend('account-suspended', {
    to: email,
    template: templates.accountSuspendedEmail({ storename, reason }),
  });
}

export function sendAccountReactivatedEmail({ email, storename }) {
  return safeSend('account-reactivated', {
    to: email,
    template: templates.accountReactivatedEmail({ storename }),
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

/**
 * Payment confirmed: receipt to the buyer, actionable sale alert to the seller.
 * Called from the PayFast ITN handler, which is the only place payment state is
 * written — so this is the one true "order placed" moment.
 */
export async function sendOrderPaidEmails({ order }) {
  const sellerEmail = await sellerAddress(order);

  const [buyer, seller] = await Promise.allSettled([
    safeSend('order-receipt', {
      to: buyerAddress(order),
      template: templates.orderReceiptEmail({ order }),
      // Buyers reply to receipts with questions about the goods; route those to
      // the seller rather than to a mailbox nobody reads.
      replyTo: sellerEmail || undefined,
    }),
    safeSend('seller-new-order', {
      to: sellerEmail,
      template: templates.sellerNewOrderEmail({ order }),
      replyTo: buyerAddress(order) || undefined,
    }),
  ]);

  return { buyer: buyer.value, seller: seller.value };
}

export function sendOrderPaymentFailedEmail({ order }) {
  return safeSend('order-payment-failed', {
    to: buyerAddress(order),
    template: templates.orderPaymentFailedEmail({ order }),
  });
}

export function sendOrderExpiredEmail({ order, timeoutMinutes }) {
  return safeSend('order-expired', {
    to: buyerAddress(order),
    template: templates.orderExpiredEmail({ order, timeoutMinutes }),
  });
}

export async function sendOrderShippedEmail({ order }) {
  const sellerEmail = await sellerAddress(order);

  return safeSend('order-shipped', {
    to: buyerAddress(order),
    template: templates.orderShippedEmail({ order }),
    replyTo: sellerEmail || undefined,
  });
}

/** Delivered: review nudge to the buyer, funds-released notice to the seller. */
export async function sendOrderDeliveredEmails({ order }) {
  const sellerEmail = await sellerAddress(order);

  const [buyer, seller] = await Promise.allSettled([
    safeSend('order-delivered-buyer', {
      to: buyerAddress(order),
      template: templates.orderDeliveredEmail({ order }),
      replyTo: sellerEmail || undefined,
    }),
    safeSend('order-delivered-seller', {
      to: sellerEmail,
      template: templates.sellerOrderDeliveredEmail({ order }),
    }),
  ]);

  return { buyer: buyer.value, seller: seller.value };
}

/** Cancellation affects both sides — stock returns, money may need refunding. */
export async function sendOrderCancelledEmails({ order }) {
  const sellerEmail = await sellerAddress(order);

  const [buyer, seller] = await Promise.allSettled([
    safeSend('order-cancelled-buyer', {
      to: buyerAddress(order),
      template: templates.orderCancelledBuyerEmail({ order }),
    }),
    safeSend('order-cancelled-seller', {
      to: sellerEmail,
      template: templates.sellerOrderCancelledEmail({ order }),
    }),
  ]);

  return { buyer: buyer.value, seller: seller.value };
}

export async function sendOrderStatusChangedEmail({ order, status }) {
  const sellerEmail = await sellerAddress(order);

  return safeSend(`order-status-${status}`, {
    to: buyerAddress(order),
    template: templates.orderStatusChangedEmail({ order, status }),
    replyTo: sellerEmail || undefined,
  });
}

/**
 * Single entry point for the order status route: maps a new status onto the
 * right notifications so the route doesn't have to carry a switch of its own.
 *
 * `previousStatus` is used to suppress duplicates — PATCHing an order to a
 * status it already holds shouldn't re-mail everyone.
 */
export async function sendOrderStatusEmails({ order, status, previousStatus }) {
  if (!order || !status || status === previousStatus) return null;

  switch (status) {
    case 'confirmed':
    case 'processing':
      return sendOrderStatusChangedEmail({ order, status });

    case 'shipped':
      return sendOrderShippedEmail({ order });

    case 'delivered':
      return sendOrderDeliveredEmails({ order });

    case 'cancelled':
      return sendOrderCancelledEmails({ order });

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/** Confirmation to the seller plus an action alert to the admin mailbox. */
export async function sendPayoutRequestedEmails({ payout, seller }) {
  const resolved = (await resolveUser(seller || payout?.seller)) || {};
  const admins = getAdminEmails();

  const sends = [
    safeSend('payout-requested-seller', {
      to: resolved.email,
      template: templates.payoutRequestedEmail({ payout, storename: resolved.storename }),
    }),
  ];

  if (admins.length) {
    sends.push(
      safeSend('payout-requested-admin', {
        to: admins,
        template: templates.payoutRequestedAdminEmail({
          payout,
          storename: resolved.storename,
          sellerEmail: resolved.email,
        }),
        replyTo: resolved.email || undefined,
      })
    );
  }

  const [sellerResult, adminResult] = await Promise.allSettled(sends);
  return { seller: sellerResult?.value, admin: adminResult?.value };
}

export async function sendPayoutApprovedEmail({ payout, seller }) {
  const resolved = (await resolveUser(seller || payout?.seller)) || {};

  return safeSend('payout-approved', {
    to: resolved.email,
    template: templates.payoutApprovedEmail({ payout, storename: resolved.storename }),
  });
}

export async function sendPayoutCompletedEmail({ payout, seller }) {
  const resolved = (await resolveUser(seller || payout?.seller)) || {};

  return safeSend('payout-completed', {
    to: resolved.email,
    template: templates.payoutCompletedEmail({ payout, storename: resolved.storename }),
  });
}

export async function sendPayoutRejectedEmail({ payout, seller, reason }) {
  const resolved = (await resolveUser(seller || payout?.seller)) || {};

  return safeSend('payout-rejected', {
    to: resolved.email,
    template: templates.payoutRejectedEmail({ payout, storename: resolved.storename, reason }),
  });
}
