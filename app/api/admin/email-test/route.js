// app/api/admin/email-test/route.js
//
// Smoke test for the Brevo setup. Mail is the one integration you cannot
// verify by reading the code: the API key can be valid while the sender
// address is unverified, or SPF/DKIM can be wrong so everything lands in spam.
// This renders a real template through the real transport and reports exactly
// what Brevo said.
//
//   GET                        → is the configuration present?
//   POST { to, template? }     → send one sample message
//
// Auth: an admin session, or `Authorization: Bearer <ADMIN_TOKEN>` so it can be
// checked from a terminal against a deployed environment.

import connectDB from '@/config/database';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { isBrevoConfigured, getPublicBaseUrl, sendTransactionalEmail } from '@/utils/brevo';
import * as templates from '@/utils/emailTemplates';
import { getAdminEmails } from '@/utils/email';

export const dynamic = 'force-dynamic';

const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function isAuthorized(request) {
  const token = process.env.ADMIN_TOKEN;
  const authHeader = request.headers.get('authorization') || '';

  if (token && authHeader === `Bearer ${token}`) return true;

  const sessionUser = await getSessionUser();
  if (!sessionUser?.userId) return false;

  await connectDB();
  const user = await User.findById(sessionUser.userId).select('isAdmin').lean();
  return Boolean(user?.isAdmin);
}

/**
 * Sample data for each template, so a test send looks like the real thing
 * rather than an empty shell. Deliberately fake — nothing here touches the
 * database.
 */
function buildSample(name) {
  const order = {
    _id: '000000000000000000000000',
    orderNumber: 'ORD-20260101-TESTSAMPLE',
    createdAt: new Date(),
    sellerName: 'Sample Home Bakery',
    buyerEmail: 'buyer@example.com',
    subtotal: 450,
    shipping: 95,
    tax: 67.5,
    total: 612.5,
    paymentStatus: 'paid',
    fulfillmentOption: 'door-to-door',
    courierProvider: 'courier-guy',
    trackingNumber: 'TCG123456789ZA',
    shippedAt: new Date(),
    estimatedDelivery: new Date(Date.now() + 3 * 86400000),
    customerNotes: 'Please leave with the neighbour if nobody is home.',
    cancellationReason: 'Out of stock',
    items: [
      { quantity: 2, price: 150, productSnapshot: { title: 'Sourdough Loaf' } },
      { quantity: 1, price: 150, productSnapshot: { title: 'Cinnamon Buns (6 pack)' } },
    ],
    shippingAddress: {
      fullName: 'Thandi Mokoena',
      email: 'buyer@example.com',
      phone: '082 000 0000',
      address: '12 Example Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      zipCode: '2196',
      country: 'South Africa',
    },
  };

  const payout = {
    referenceNumber: 'PO-20260101-0001',
    amount: 3825.5,
    requestedAt: new Date(),
    processedAt: new Date(),
    completedAt: new Date(),
    failedAt: new Date(),
    externalReference: 'FNB-TRF-99812',
    // Plain text here rather than an encrypted snapshot — maskAccount passes
    // unencrypted legacy values straight through, so the sample still masks.
    bankDetails: {
      accountHolder: 'Sample Home Bakery',
      bankName: 'First National Bank',
      accountNumber: '62001234567',
      branchCode: '250655',
      accountType: 'cheque',
    },
  };

  const samples = {
    welcome: () => templates.welcomeEmail({ storename: 'Sample Store', role: 'buyer' }),
    'welcome-seller': () => templates.welcomeEmail({ storename: 'Sample Store', role: 'seller' }),
    'seller-upgrade': () => templates.sellerUpgradeEmail({ storename: 'Sample Store' }),
    'password-reset': () =>
      templates.passwordResetEmail({
        storename: 'Sample Store',
        resetUrl: `${getPublicBaseUrl()}/auth/reset-password?token=sample-token-not-valid`,
      }),
    'password-reset-social': () =>
      templates.passwordResetSocialEmail({ storename: 'Sample Store', provider: 'google' }),
    'password-changed': () => templates.passwordChangedEmail({ storename: 'Sample Store' }),
    'account-suspended': () =>
      templates.accountSuspendedEmail({ storename: 'Sample Store', reason: 'Sample reason' }),
    'account-reactivated': () => templates.accountReactivatedEmail({ storename: 'Sample Store' }),
    'order-receipt': () => templates.orderReceiptEmail({ order }),
    'order-payment-failed': () => templates.orderPaymentFailedEmail({ order }),
    'order-expired': () => templates.orderExpiredEmail({ order, timeoutMinutes: 30 }),
    'order-shipped': () => templates.orderShippedEmail({ order }),
    'order-delivered': () => templates.orderDeliveredEmail({ order }),
    'order-status': () => templates.orderStatusChangedEmail({ order, status: 'processing' }),
    'order-cancelled': () => templates.orderCancelledBuyerEmail({ order }),
    'seller-new-order': () => templates.sellerNewOrderEmail({ order }),
    'seller-order-cancelled': () => templates.sellerOrderCancelledEmail({ order }),
    'seller-order-delivered': () => templates.sellerOrderDeliveredEmail({ order }),
    'payout-requested': () => templates.payoutRequestedEmail({ payout, storename: 'Sample Store' }),
    'payout-requested-admin': () =>
      templates.payoutRequestedAdminEmail({
        payout,
        storename: 'Sample Store',
        sellerEmail: 'seller@example.com',
      }),
    'payout-approved': () => templates.payoutApprovedEmail({ payout, storename: 'Sample Store' }),
    'payout-completed': () => templates.payoutCompletedEmail({ payout, storename: 'Sample Store' }),
    'payout-rejected': () =>
      templates.payoutRejectedEmail({
        payout,
        storename: 'Sample Store',
        reason: 'Account holder name does not match',
      }),
  };

  return { build: samples[name], available: Object.keys(samples) };
}

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { available } = buildSample();

  return jsonResponse({
    configured: isBrevoConfigured(),
    // Never echo the key itself, only whether it is present.
    hasApiKey: Boolean(process.env.BREVO_API_KEY),
    from: process.env.EMAIL_FROM || null,
    fromName: process.env.EMAIL_FROM_NAME || 'Ohi!',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || null,
    bcc: process.env.EMAIL_BCC || null,
    overrideTo: process.env.EMAIL_OVERRIDE_TO || null,
    disabled: String(process.env.EMAIL_DISABLED || '').toLowerCase() === 'true',
    linkBaseUrl: getPublicBaseUrl(),
    adminNotificationEmails: getAdminEmails(),
    templates: available,
    usage: 'POST { "to": "you@example.com", "template": "order-receipt" }',
  });
}

export async function POST(request) {
  if (!(await isAuthorized(request))) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is fine — it falls back to the admin address below.
  }

  const to = body.to || getAdminEmails()[0];
  const name = body.template || 'order-receipt';

  if (!to) {
    return jsonResponse(
      { error: 'No recipient. Pass { "to": "you@example.com" } or set ADMIN_EMAILS.' },
      400
    );
  }

  const { build, available } = buildSample(name);

  if (!build) {
    return jsonResponse({ error: `Unknown template "${name}"`, available }, 400);
  }

  const template = build();

  const result = await sendTransactionalEmail({
    to,
    subject: `[TEST] ${template.subject}`,
    html: template.html,
    text: template.text,
    tags: ['test', ...(template.tags || [])],
  });

  return jsonResponse(
    {
      sent: Boolean(result.success),
      template: name,
      to,
      ...result,
    },
    result.success ? 200 : 502
  );
}
