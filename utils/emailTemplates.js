// utils/emailTemplates.js
//
// Every email body the app sends. Each template is a small data declaration
// that `buildEmail` renders into both an HTML and a plain-text part, so the two
// can't drift apart and no template has to hand-write table markup.
//
// Mail clients are a decade behind browsers: the layout is a fixed-width
// table with inline styles, because flexbox, grid and external stylesheets are
// unreliable in Outlook and several mobile clients.
//
// These functions are pure — they return { subject, html, text, tags } and send
// nothing. utils/email.js is what actually delivers them.

import { getPublicBaseUrl } from '@/utils/brevo';
import { decryptField, maskAccountNumber } from '@/utils/fieldEncryption';

const BRAND = {
  name: 'Ohi!',
  tagline: 'Pitch. Persuade. Procure.',
  primary: '#059669',
  primaryDark: '#047857',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#f9fafb',
  danger: '#dc2626',
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Escape anything that came from a user or a courier before it goes near the
 * HTML part. Store names, product titles and addresses are all free text, and
 * an unescaped apostrophe or angle bracket breaks the markup at best.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatZAR(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 'R 0.00';
  return `R ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`;
}

export function formatDate(date) {
  if (!date) return '';
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Johannesburg',
  });
}

/** Absolute URL for a path. Relative links are meaningless inside an inbox. */
export function url(path = '/') {
  const base = getPublicBaseUrl();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Human label for a one-line address snapshot. */
export function formatAddress(address) {
  if (!address) return '';
  return [
    address.fullName || address.name,
    address.address,
    address.apartment,
    address.city,
    address.province,
    address.zipCode || address.postalCode,
    address.country,
  ]
    .map((part) => (part || '').toString().trim())
    .filter(Boolean)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

function renderRows(rows) {
  const cells = rows
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;font-size:14px;color:${BRAND.muted};white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0 6px 16px;font-size:14px;color:${BRAND.text};font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  if (!cells) return '';

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${cells}</table>`;
}

function renderItems(items) {
  const body = items
    .map((item) => {
      const title = item.productSnapshot?.title || item.title || 'Item';
      const qty = item.quantity ?? 1;
      const price = Number(item.price) || 0;

      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.text};">
            ${escapeHtml(title)}
            <span style="color:${BRAND.muted};">&nbsp;&times;&nbsp;${escapeHtml(qty)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-size:14px;color:${BRAND.text};text-align:right;white-space:nowrap;">
            ${escapeHtml(formatZAR(price * qty))}
          </td>
        </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${body}</table>`;
}

function renderTotals(totals) {
  const cells = totals
    .map(
      ({ label, value, strong }) => `
        <tr>
          <td style="padding:${strong ? '12px 0 0' : '6px 0'};font-size:${strong ? '16px' : '14px'};color:${strong ? BRAND.text : BRAND.muted};font-weight:${strong ? '700' : '400'};">${escapeHtml(label)}</td>
          <td style="padding:${strong ? '12px 0 0' : '6px 0'};font-size:${strong ? '16px' : '14px'};color:${strong ? BRAND.primary : BRAND.text};font-weight:${strong ? '700' : '600'};text-align:right;white-space:nowrap;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${cells}</table>`;
}

function renderSection(section) {
  const title = section.title
    ? `<p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(section.title)}</p>`
    : '';

  const wrap = (inner) => `
    <tr><td style="padding:8px 0;">
      <div style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:10px;padding:16px 18px;">
        ${title}${inner}
      </div>
    </td></tr>`;

  switch (section.type) {
    case 'rows':
      return wrap(renderRows(section.rows || []));

    case 'items': {
      const totals = section.totals?.length
        ? `<div style="margin-top:14px;">${renderTotals(section.totals)}</div>`
        : '';
      return wrap(`${renderItems(section.items || [])}${totals}`);
    }

    case 'code':
      return wrap(`
        <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:20px;font-weight:700;letter-spacing:.08em;color:${BRAND.text};word-break:break-all;">
          ${escapeHtml(section.value)}
        </p>`);

    case 'note':
      return `
        <tr><td style="padding:8px 0;">
          <div style="border-left:3px solid ${section.variant === 'danger' ? BRAND.danger : BRAND.primary};padding:4px 0 4px 14px;">
            <p style="margin:0;font-size:14px;line-height:22px;color:${BRAND.muted};">${escapeHtml(section.text)}</p>
          </div>
        </td></tr>`;

    case 'html':
      return `<tr><td style="padding:8px 0;">${section.html}</td></tr>`;

    default:
      return '';
  }
}

function sectionToText(section) {
  const title = section.title ? `${section.title.toUpperCase()}\n` : '';

  switch (section.type) {
    case 'rows': {
      const lines = (section.rows || [])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => `  ${label}: ${value}`)
        .join('\n');
      return lines ? `${title}${lines}` : '';
    }

    case 'items': {
      const lines = (section.items || [])
        .map((item) => {
          const label = item.productSnapshot?.title || item.title || 'Item';
          const qty = item.quantity ?? 1;
          const price = Number(item.price) || 0;
          return `  ${label} x ${qty} — ${formatZAR(price * qty)}`;
        })
        .join('\n');

      const totals = (section.totals || [])
        .map(({ label, value }) => `  ${label}: ${value}`)
        .join('\n');

      return [title.trim(), lines, totals].filter(Boolean).join('\n');
    }

    case 'code':
      return `${title}  ${section.value}`;

    case 'note':
      return section.text;

    case 'html':
      return section.text || '';

    default:
      return '';
  }
}

/**
 * Render a template declaration into a deliverable message.
 *
 * @param {object}   spec
 * @param {string}   spec.subject
 * @param {string}   [spec.preheader]   Inbox preview line (hidden in the body)
 * @param {string}   spec.heading
 * @param {string[]} [spec.paragraphs]
 * @param {object[]} [spec.sections]    See renderSection for supported types
 * @param {object}   [spec.cta]         { label, url }
 * @param {string}   [spec.footerNote]
 * @param {string[]} [spec.tags]        Brevo tags
 */
export function buildEmail({
  subject,
  preheader = '',
  heading,
  paragraphs = [],
  sections = [],
  cta,
  footerNote,
  tags = [],
}) {
  const paragraphsHtml = paragraphs
    .filter(Boolean)
    .map(
      (text) =>
        `<tr><td style="padding:0 0 14px;font-size:15px;line-height:24px;color:${BRAND.text};">${text}</td></tr>`
    )
    .join('');

  const sectionsHtml = sections.filter(Boolean).map(renderSection).join('');

  const ctaHtml = cta?.url
    ? `
      <tr><td style="padding:22px 0 6px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="background:${BRAND.primary};border-radius:8px;">
            <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 6px;font-size:12px;line-height:20px;color:${BRAND.muted};word-break:break-all;">
        Button not working? Paste this into your browser:<br />
        <a href="${escapeHtml(cta.url)}" style="color:${BRAND.primaryDark};">${escapeHtml(cta.url)}</a>
      </td></tr>`
    : '';

  const footerNoteHtml = footerNote
    ? `<p style="margin:0 0 10px;font-size:12px;line-height:20px;color:${BRAND.muted};">${footerNote}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;width:100%;border-collapse:collapse;">
    <tr><td align="center" style="padding:28px 12px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <!-- Header -->
        <tr><td style="padding:0 0 18px;">
          <a href="${escapeHtml(url('/'))}" style="font-size:24px;font-weight:800;color:${BRAND.primary};text-decoration:none;letter-spacing:-.02em;">${BRAND.name}</a>
          <span style="font-size:12px;color:${BRAND.muted};padding-left:10px;">${BRAND.tagline}</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;padding:30px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:0 0 16px;font-size:21px;line-height:30px;font-weight:700;color:${BRAND.text};">${escapeHtml(heading)}</td></tr>
            ${paragraphsHtml}
            ${sectionsHtml}
            ${ctaHtml}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 6px 0;">
          ${footerNoteHtml}
          <p style="margin:0 0 6px;font-size:12px;line-height:20px;color:${BRAND.muted};">
            Sent by ${BRAND.name} &middot; home businesses across South Africa<br />
            <a href="${escapeHtml(url('/dashboard'))}" style="color:${BRAND.primaryDark};">Dashboard</a> &middot;
            <a href="${escapeHtml(url('/policies/privacy'))}" style="color:${BRAND.primaryDark};">Privacy</a> &middot;
            <a href="${escapeHtml(url('/policies/terms'))}" style="color:${BRAND.primaryDark};">Terms</a>
          </p>
          <p style="margin:0;font-size:12px;line-height:20px;color:${BRAND.muted};">
            This is a transactional message about your ${BRAND.name} account or order.
          </p>
        </td></tr>

      </table>

    </td></tr>
  </table>
</body>
</html>`;

  // Plain text is built from the same declaration, so it always says the same
  // thing as the HTML part. Spam filters score a missing or stale text part
  // against you, and some clients only ever show it.
  const stripTags = (value) =>
    String(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');

  const text = [
    heading,
    '',
    ...paragraphs.filter(Boolean).map(stripTags),
    '',
    ...sections.filter(Boolean).map(sectionToText).filter(Boolean),
    '',
    cta?.url ? `${cta.label}: ${cta.url}` : '',
    '',
    footerNote ? stripTags(footerNote) : '',
    `— ${BRAND.name} · ${url('/')}`,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { subject, html, text, tags };
}

// ---------------------------------------------------------------------------
// Shared order fragments
// ---------------------------------------------------------------------------

function orderTotals(order) {
  const totals = [
    { label: 'Subtotal', value: formatZAR(order.subtotal) },
    { label: 'Shipping', value: order.shipping ? formatZAR(order.shipping) : 'Free' },
  ];

  if (Number(order.tax) > 0) {
    totals.push({ label: 'VAT (15%)', value: formatZAR(order.tax) });
  }

  totals.push({ label: 'Total', value: formatZAR(order.total), strong: true });
  return totals;
}

const FULFILLMENT_LABELS = {
  'door-to-door': 'Courier delivery to your door',
  pudo: 'PUDO locker collection',
  collection: 'Collect from the seller',
};

const PAYMENT_LABELS = {
  payfast: 'Paid via PayFast',
  card: 'Paid by card',
  eft: 'Paid by EFT',
  cash_on_delivery: 'Cash on delivery',
};

function paymentLabel(order) {
  return PAYMENT_LABELS[order?.paymentMethod] || 'Paid';
}

function deliverySection(order) {
  if (order.fulfillmentOption === 'pudo' && order.lockerDetails?.lockerName) {
    return {
      type: 'rows',
      title: 'Collection locker',
      rows: [
        ['Locker', order.lockerDetails.lockerName],
        ['Address', order.lockerDetails.lockerAddress],
        ['Size', order.lockerDetails.lockerSize],
      ],
    };
  }

  if (order.fulfillmentOption === 'collection') {
    return {
      type: 'rows',
      title: 'Collection',
      rows: [
        ['Method', 'Collect from the seller'],
        ['Seller', order.sellerName],
        ['Contact', order.sellerAddressSnapshot?.phone || order.sellerAddressSnapshot?.email],
        ['Address', formatAddress(order.sellerAddressSnapshot)],
      ],
    };
  }

  return {
    type: 'rows',
    title: 'Delivery address',
    rows: [
      ['Name', order.shippingAddress?.fullName],
      ['Address', formatAddress(order.shippingAddress)],
      ['Phone', order.shippingAddress?.phone],
    ],
  };
}

// ---------------------------------------------------------------------------
// Account & authentication
// ---------------------------------------------------------------------------

export function welcomeEmail({ storename, role = 'buyer' }) {
  const isSeller = role === 'seller';

  return buildEmail({
    subject: `Welcome to ${BRAND.name}, ${storename || 'there'}!`,
    preheader: isSeller
      ? 'Finish setting up your store and list your first product.'
      : 'Discover home businesses near you.',
    heading: `Welcome to ${BRAND.name}`,
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your account is ready.`,
      isSeller
        ? 'You signed up as a seller. Complete your store profile so buyers can find you, then add your first product — stores with a full address and photos get noticeably more orders.'
        : `${BRAND.name} connects you with home businesses across South Africa. Browse stores near you, save favourites, and check out securely with PayFast.`,
    ],
    sections: [
      {
        type: 'rows',
        title: 'Next steps',
        rows: isSeller
          ? [
              ['1', 'Complete your store profile and address'],
              ['2', 'Add bank details so payouts can reach you'],
              ['3', 'List your first product'],
            ]
          : [
              ['1', 'Complete your profile'],
              ['2', 'Browse stores near you'],
              ['3', 'Save products to your favourites'],
            ],
      },
    ],
    cta: {
      label: isSeller ? 'Set up my store' : 'Start browsing',
      url: url(isSeller ? '/dashboard/profile' : '/products'),
    },
    tags: ['welcome', role],
  });
}

export function sellerUpgradeEmail({ storename }) {
  return buildEmail({
    subject: `Your ${BRAND.name} seller account is active`,
    preheader: 'You can now list products and take orders.',
    heading: 'You can start selling',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your account has been upgraded to a seller account.`,
      'Before your first sale, make sure your store address and bank details are on file — the address is used to quote couriers, and the bank details are where your payouts go.',
    ],
    sections: [
      {
        type: 'rows',
        title: 'Set up checklist',
        rows: [
          ['Store profile', 'Address, phone and about section'],
          ['Bank details', 'Required before you can request a payout'],
          ['Products', 'Add photos, price, stock and parcel dimensions'],
        ],
      },
      {
        type: 'note',
        text: 'Parcel weight and dimensions matter: they are what courier quotes are calculated from, so guessing them costs you money on every order.',
      },
    ],
    cta: { label: 'Open seller dashboard', url: url('/dashboard/products') },
    tags: ['seller-upgrade'],
  });
}

export function passwordResetEmail({ storename, resetUrl, expiresInMinutes = 60 }) {
  return buildEmail({
    subject: `Reset your ${BRAND.name} password`,
    preheader: `This link expires in ${expiresInMinutes} minutes.`,
    heading: 'Reset your password',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, we received a request to reset the password on your ${BRAND.name} account.`,
      `Use the button below to choose a new one. The link expires in <strong>${expiresInMinutes} minutes</strong> and can only be used once.`,
    ],
    sections: [
      {
        type: 'note',
        text: 'If you did not ask for this, you can ignore this email — your password stays as it is, and nobody can reset it without this link.',
      },
    ],
    cta: { label: 'Choose a new password', url: resetUrl },
    footerNote: 'For your security, never forward this email. Anyone with this link can set a new password on your account.',
    tags: ['password-reset'],
  });
}

/**
 * Sent when a reset is requested for an account that signs in with Google or
 * Facebook. Such an account has no password to reset, and saying so is better
 * than silence — the alternative is a user waiting for a mail that will never
 * arrive. It also avoids creating a password-based login path on an account
 * that deliberately has none.
 */
export function passwordResetSocialEmail({ storename, provider }) {
  const providerName = provider === 'facebook' ? 'Facebook' : 'Google';

  return buildEmail({
    subject: `Sign in to ${BRAND.name} with ${providerName}`,
    preheader: `Your account uses ${providerName} sign-in — there is no password to reset.`,
    heading: `Use ${providerName} to sign in`,
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, someone asked to reset the password for this email address.`,
      `This account was created with <strong>${providerName}</strong> sign-in, so it does not have a password. Click below and choose "${providerName}" to get in.`,
    ],
    cta: { label: 'Go to sign in', url: url('/auth/signin') },
    footerNote: 'If this was not you, no action is needed — nothing about your account has changed.',
    tags: ['password-reset', 'social-account'],
  });
}

export function passwordChangedEmail({ storename, when = new Date() }) {
  return buildEmail({
    subject: `Your ${BRAND.name} password was changed`,
    preheader: 'If this was not you, secure your account now.',
    heading: 'Your password was changed',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, the password on your ${BRAND.name} account was changed successfully.`,
      'You can now sign in with your new password.',
    ],
    sections: [
      { type: 'rows', rows: [['Changed on', formatDate(when)]] },
      {
        type: 'note',
        variant: 'danger',
        text: 'If you did not make this change, request a new password reset immediately and contact us — someone else may have access to your email.',
      },
    ],
    cta: { label: 'Sign in', url: url('/auth/signin') },
    tags: ['password-changed'],
  });
}

export function accountSuspendedEmail({ storename, reason }) {
  return buildEmail({
    subject: `Your ${BRAND.name} account has been suspended`,
    preheader: 'Your listings are hidden while the account is suspended.',
    heading: 'Account suspended',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your ${BRAND.name} account has been suspended by our team.`,
      'While an account is suspended its products are hidden from the marketplace and no new orders can be placed.',
    ],
    sections: [
      { type: 'rows', rows: [['Reason', reason || 'Suspended by admin']] },
      {
        type: 'note',
        text: 'If you believe this is a mistake, reply to this email and we will review the account.',
      },
    ],
    tags: ['account-suspended'],
  });
}

export function accountReactivatedEmail({ storename }) {
  return buildEmail({
    subject: `Your ${BRAND.name} account is active again`,
    preheader: 'Your listings are back online.',
    heading: 'Account reactivated',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your ${BRAND.name} account has been reactivated and your products are visible to buyers again.`,
    ],
    cta: { label: 'Open dashboard', url: url('/dashboard') },
    tags: ['account-reactivated'],
  });
}

// ---------------------------------------------------------------------------
// Orders — buyer
// ---------------------------------------------------------------------------

export function orderReceiptEmail({ order }) {
  return buildEmail({
    subject: `Order confirmed — ${order.orderNumber}`,
    preheader: `We received your payment of ${formatZAR(order.total)}. ${order.sellerName} is preparing your order.`,
    heading: 'Thanks — your order is confirmed',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, your payment went through and <strong>${escapeHtml(order.sellerName)}</strong> has been notified to prepare your order.`,
      'Keep this email as your receipt. You can follow the order from your dashboard at any time.',
    ],
    sections: [
      {
        type: 'rows',
        title: 'Order details',
        rows: [
          ['Order number', order.orderNumber],
          ['Order date', formatDate(order.createdAt || new Date())],
          ['Seller', order.sellerName],
          ['Payment', paymentLabel(order)],
          ['Fulfilment', FULFILLMENT_LABELS[order.fulfillmentOption] || 'Courier delivery'],
          [
            'Estimated delivery',
            order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '',
          ],
        ],
      },
      { type: 'items', title: 'What you ordered', items: order.items || [], totals: orderTotals(order) },
      deliverySection(order),
    ],
    cta: { label: 'View my order', url: url(`/dashboard/purchases/${order._id}`) },
    footerNote: `Questions about the items themselves? Message ${escapeHtml(order.sellerName)} directly from the order page.`,
    tags: ['order-receipt', 'buyer'],
  });
}

export function orderPaymentFailedEmail({ order }) {
  return buildEmail({
    subject: `Payment failed — ${order.orderNumber}`,
    preheader: 'Your order was not placed and you have not been charged.',
    heading: 'Your payment did not go through',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, PayFast could not complete the payment for order <strong>${escapeHtml(order.orderNumber)}</strong>, so the order has been cancelled.`,
      'Nothing has been charged and the items have been returned to stock. Your cart is still intact if you would like to try again.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Amount', formatZAR(order.total)],
          ['Seller', order.sellerName],
        ],
      },
    ],
    cta: { label: 'Return to checkout', url: url('/cart') },
    tags: ['order-payment-failed', 'buyer'],
  });
}

export function orderExpiredEmail({ order, timeoutMinutes = 30 }) {
  return buildEmail({
    subject: `Order cancelled — ${order.orderNumber}`,
    preheader: 'Payment was not completed, so we released the items.',
    heading: 'Your order was cancelled',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, order <strong>${escapeHtml(order.orderNumber)}</strong> was cancelled because payment was not completed within ${timeoutMinutes} minutes.`,
      'You have not been charged, and the items are back in stock for anyone to buy. If you still want them, your cart is waiting.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Amount', formatZAR(order.total)],
          ['Seller', order.sellerName],
        ],
      },
    ],
    cta: { label: 'Back to my cart', url: url('/cart') },
    tags: ['order-expired', 'buyer'],
  });
}

export function orderShippedEmail({ order }) {
  const isPudo = order.fulfillmentOption === 'pudo';

  const sections = [
    {
      type: 'rows',
      title: 'Shipment',
      rows: [
        ['Order number', order.orderNumber],
        ['Seller', order.sellerName],
        ['Courier', order.courierProvider || 'Courier'],
        ['Shipped on', formatDate(order.shippedAt || new Date())],
        [
          'Estimated arrival',
          order.estimatedDelivery ? formatDate(order.estimatedDelivery) : '',
        ],
      ],
    },
  ];

  if (order.trackingNumber) {
    sections.push({ type: 'code', title: 'Tracking number', value: order.trackingNumber });
  }

  if (isPudo && order.lockerDetails?.lockerName) {
    sections.push({
      type: 'rows',
      title: 'Collect from',
      rows: [
        ['Locker', order.lockerDetails.lockerName],
        ['Address', order.lockerDetails.lockerAddress],
      ],
    });
    sections.push({
      type: 'note',
      text: 'You will receive a collection PIN from the locker provider when your parcel arrives. Parcels are usually held for a limited number of days, so collect it promptly.',
    });
  } else {
    sections.push({
      type: 'rows',
      title: 'Delivering to',
      rows: [
        ['Name', order.shippingAddress?.fullName],
        ['Address', formatAddress(order.shippingAddress)],
      ],
    });
  }

  return buildEmail({
    subject: `On its way — ${order.orderNumber}`,
    preheader: order.trackingNumber
      ? `Tracking number ${order.trackingNumber}`
      : 'Your parcel has been handed to the courier.',
    heading: isPudo ? 'Your parcel is on its way to the locker' : 'Your order has shipped',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, <strong>${escapeHtml(order.sellerName)}</strong> has handed your order to the courier.`,
    ],
    sections,
    cta: { label: 'Track my order', url: url(`/dashboard/purchases/${order._id}`) },
    tags: ['order-shipped', 'buyer'],
  });
}

export function orderDeliveredEmail({ order }) {
  return buildEmail({
    subject: `Delivered — ${order.orderNumber}`,
    preheader: 'How did it go? A review helps the seller and the next buyer.',
    heading: 'Your order was delivered',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, order <strong>${escapeHtml(order.orderNumber)}</strong> from <strong>${escapeHtml(order.sellerName)}</strong> is marked as delivered.`,
      'If everything arrived as expected, a short review makes a real difference to a small home business — and helps the next buyer decide.',
    ],
    sections: [
      {
        type: 'items',
        title: 'Your items',
        items: order.items || [],
        totals: [{ label: 'Total paid', value: formatZAR(order.total), strong: true }],
      },
      {
        type: 'note',
        text: 'Something wrong with your order? Message the seller from the order page, or reply to this email and we will help sort it out.',
      },
    ],
    cta: { label: 'Leave a review', url: url(`/dashboard/purchases/${order._id}`) },
    tags: ['order-delivered', 'buyer'],
  });
}

export function orderStatusChangedEmail({ order, status }) {
  const copy = {
    confirmed: {
      heading: 'Your order has been confirmed',
      body: 'The seller has confirmed your order and will start preparing it.',
    },
    processing: {
      heading: 'Your order is being prepared',
      body: 'The seller is packing your order. You will get another email with tracking details as soon as it ships.',
    },
  }[status] || {
    heading: 'Your order was updated',
    body: `Your order status is now <strong>${escapeHtml(status)}</strong>.`,
  };

  return buildEmail({
    subject: `Order update — ${order.orderNumber}`,
    preheader: copy.heading,
    heading: copy.heading,
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, ${copy.body}`,
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Seller', order.sellerName],
          ['Status', status],
          ['Total', formatZAR(order.total)],
        ],
      },
    ],
    cta: { label: 'View my order', url: url(`/dashboard/purchases/${order._id}`) },
    tags: ['order-status', 'buyer', status],
  });
}

export function orderCancelledBuyerEmail({ order }) {
  return buildEmail({
    subject: `Order cancelled — ${order.orderNumber}`,
    preheader: 'Your order has been cancelled.',
    heading: 'Your order was cancelled',
    paragraphs: [
      `Hi <strong>${escapeHtml(order.shippingAddress?.fullName || 'there')}</strong>, order <strong>${escapeHtml(order.orderNumber)}</strong> from <strong>${escapeHtml(order.sellerName)}</strong> has been cancelled.`,
      order.paymentStatus === 'paid'
        ? 'Because this order was already paid, a refund has been recorded and will be processed back to your original payment method.'
        : 'No payment was taken for this order.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Amount', formatZAR(order.total)],
          ['Reason', order.cancellationReason || 'Cancelled'],
        ],
      },
    ],
    cta: { label: 'View order', url: url(`/dashboard/purchases/${order._id}`) },
    tags: ['order-cancelled', 'buyer'],
  });
}

// ---------------------------------------------------------------------------
// Orders — seller
// ---------------------------------------------------------------------------

export function sellerNewOrderEmail({ order }) {
  const actionNote = {
    'door-to-door': 'A courier shipment is being booked automatically. Have the parcel packed and ready for collection.',
    pudo: 'Pack the parcel, then pick your drop-off locker from the order page to generate the shipment.',
    collection: 'The buyer will collect from you. Get in touch to arrange a time.',
  }[order.fulfillmentOption] || 'Pack the parcel and arrange shipping from the order page.';

  return buildEmail({
    subject: `New order ${order.orderNumber} — ${formatZAR(order.total)}`,
    preheader: `${(order.items || []).length} item(s) sold. Payment confirmed.`,
    heading: 'You have a new paid order',
    paragraphs: [
      `Good news — <strong>${escapeHtml(order.shippingAddress?.fullName || order.buyerEmail)}</strong> has paid for an order from your store.`,
      actionNote,
    ],
    sections: [
      {
        type: 'rows',
        title: 'Order details',
        rows: [
          ['Order number', order.orderNumber],
          ['Placed', formatDate(order.createdAt || new Date())],
          ['Payment', paymentLabel(order)],
          ['Fulfilment', FULFILLMENT_LABELS[order.fulfillmentOption] || 'Courier delivery'],
        ],
      },
      { type: 'items', title: 'Items sold', items: order.items || [], totals: orderTotals(order) },
      {
        type: 'rows',
        title: 'Ship to',
        rows: [
          ['Name', order.shippingAddress?.fullName],
          ['Address', formatAddress(order.shippingAddress)],
          ['Phone', order.shippingAddress?.phone],
          ['Email', order.shippingAddress?.email || order.buyerEmail],
        ],
      },
      order.customerNotes
        ? { type: 'note', text: `Buyer's note: ${order.customerNotes}` }
        : null,
      {
        type: 'note',
        text: 'Your earnings for this sale are held as pending in your wallet and become available for payout once the order is delivered.',
      },
    ],
    cta: { label: 'Fulfil this order', url: url(`/dashboard/orders/${order._id}`) },
    tags: ['new-order', 'seller'],
  });
}

export function sellerOrderCancelledEmail({ order }) {
  return buildEmail({
    subject: `Order cancelled — ${order.orderNumber}`,
    preheader: 'Stock has been returned to your inventory.',
    heading: 'An order was cancelled',
    paragraphs: [
      `Order <strong>${escapeHtml(order.orderNumber)}</strong> has been cancelled. The items have been returned to your stock automatically — no action needed on the listing.`,
      order.paymentStatus === 'paid'
        ? 'This order had been paid, so a refund entry has been recorded against your wallet.'
        : 'No payment had been taken for this order.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Buyer', order.shippingAddress?.fullName || order.buyerEmail],
          ['Amount', formatZAR(order.total)],
          ['Reason', order.cancellationReason || 'Cancelled'],
        ],
      },
    ],
    cta: { label: 'View order', url: url(`/dashboard/orders/${order._id}`) },
    tags: ['order-cancelled', 'seller'],
  });
}

export function sellerOrderDeliveredEmail({ order }) {
  return buildEmail({
    subject: `Delivered — ${order.orderNumber} earnings released`,
    preheader: 'Your earnings for this order are now available for payout.',
    heading: 'Order delivered — earnings released',
    paragraphs: [
      `Order <strong>${escapeHtml(order.orderNumber)}</strong> has been marked as delivered.`,
      'Your earnings for this sale have moved from pending to available in your wallet, so you can include them in your next payout request.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Order number', order.orderNumber],
          ['Buyer', order.shippingAddress?.fullName || order.buyerEmail],
          ['Goods subtotal', formatZAR(order.subtotal)],
        ],
      },
      {
        type: 'note',
        text: 'Platform commission is deducted from the goods subtotal. The exact net amount is shown on your wallet transaction.',
      },
    ],
    cta: { label: 'Open my wallet', url: url('/dashboard/wallet') },
    tags: ['order-delivered', 'seller'],
  });
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/**
 * Last four digits of a stored account number.
 *
 * Bank account numbers are encrypted at rest (see utils/fieldEncryption), and
 * the Payout document holds the *encrypted* snapshot — so this has to decrypt
 * before masking, or the "last four digits" would be four characters of
 * ciphertext. Failure (missing key, corrupted value) degrades to showing
 * nothing rather than throwing: the mask is a convenience, and it is not worth
 * losing a payout notification over.
 */
function maskAccount(storedAccountNumber) {
  if (!storedAccountNumber) return '';

  try {
    const plain = decryptField(storedAccountNumber);
    return maskAccountNumber(String(plain).replace(/\s+/g, ''));
  } catch (error) {
    console.warn(`[email] could not mask account number: ${error.message}`);
    return '';
  }
}

export function payoutRequestedEmail({ payout, storename }) {
  return buildEmail({
    subject: `Payout request received — ${payout.referenceNumber}`,
    preheader: `${formatZAR(payout.amount)} is being reviewed.`,
    heading: 'We received your payout request',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your payout request has been logged and is waiting for review.`,
      'Requests are reviewed on business days. You will get another email when the transfer is approved and again once it has been paid out.',
    ],
    sections: [
      {
        type: 'rows',
        title: 'Request details',
        rows: [
          ['Reference', payout.referenceNumber],
          ['Amount', formatZAR(payout.amount)],
          ['Requested', formatDate(payout.requestedAt || new Date())],
          ['Bank', payout.bankDetails?.bankName],
          ['Account', maskAccount(payout.bankDetails?.accountNumber)],
        ],
      },
      {
        type: 'note',
        text: 'The requested amount is held while the payout is pending, so it no longer shows as available in your wallet.',
      },
    ],
    cta: { label: 'View payout history', url: url('/dashboard/wallet') },
    tags: ['payout-requested', 'seller'],
  });
}

export function payoutRequestedAdminEmail({ payout, storename, sellerEmail }) {
  return buildEmail({
    subject: `[Action] Payout request ${payout.referenceNumber} — ${formatZAR(payout.amount)}`,
    preheader: `${storename} requested a payout.`,
    heading: 'New payout request to review',
    paragraphs: [`<strong>${escapeHtml(storename || 'A seller')}</strong> has requested a payout.`],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Reference', payout.referenceNumber],
          ['Amount', formatZAR(payout.amount)],
          ['Seller', storename],
          ['Seller email', sellerEmail],
          ['Bank', payout.bankDetails?.bankName],
          ['Account holder', payout.bankDetails?.accountHolder],
          ['Account', maskAccount(payout.bankDetails?.accountNumber)],
          ['Branch code', payout.bankDetails?.branchCode],
          ['Requested', formatDate(payout.requestedAt || new Date())],
        ],
      },
      {
        type: 'note',
        text: 'Full account details are only visible in the admin wallet dashboard — this email deliberately shows a masked account number.',
      },
    ],
    cta: { label: 'Review in admin', url: url('/dashboard/admin/wallet') },
    tags: ['payout-requested', 'admin'],
  });
}

export function payoutApprovedEmail({ payout, storename }) {
  return buildEmail({
    subject: `Payout approved — ${payout.referenceNumber}`,
    preheader: `${formatZAR(payout.amount)} is being transferred.`,
    heading: 'Your payout was approved',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your payout request has been approved and the bank transfer is being processed.`,
      'Bank transfers in South Africa usually reflect within 1–3 business days, depending on your bank.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Reference', payout.referenceNumber],
          ['Amount', formatZAR(payout.amount)],
          ['Approved', formatDate(payout.processedAt || new Date())],
          ['Bank', payout.bankDetails?.bankName],
          ['Account', maskAccount(payout.bankDetails?.accountNumber)],
        ],
      },
    ],
    cta: { label: 'View my wallet', url: url('/dashboard/wallet') },
    tags: ['payout-approved', 'seller'],
  });
}

export function payoutCompletedEmail({ payout, storename }) {
  return buildEmail({
    subject: `Payout sent — ${formatZAR(payout.amount)}`,
    preheader: `Reference ${payout.referenceNumber} has been paid out.`,
    heading: 'Your payout has been sent',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, <strong>${escapeHtml(formatZAR(payout.amount))}</strong> has been transferred to your bank account.`,
      'Use the bank reference below if you need to trace the deposit on your statement.',
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Reference', payout.referenceNumber],
          ['Amount', formatZAR(payout.amount)],
          ['Paid on', formatDate(payout.completedAt || new Date())],
          ['Bank reference', payout.externalReference],
          ['Bank', payout.bankDetails?.bankName],
          ['Account', maskAccount(payout.bankDetails?.accountNumber)],
        ],
      },
      {
        type: 'note',
        text: 'If the money has not reflected after 3 business days, reply to this email with the reference above and we will follow it up.',
      },
    ],
    cta: { label: 'View my wallet', url: url('/dashboard/wallet') },
    tags: ['payout-completed', 'seller'],
  });
}

export function payoutRejectedEmail({ payout, storename, reason }) {
  return buildEmail({
    subject: `Payout request declined — ${payout.referenceNumber}`,
    preheader: 'The funds have been returned to your available balance.',
    heading: 'Your payout request was declined',
    paragraphs: [
      `Hi <strong>${escapeHtml(storename || 'there')}</strong>, your payout request could not be processed.`,
      `The full amount of <strong>${escapeHtml(formatZAR(payout.amount))}</strong> has been returned to your available balance, so nothing is lost — you can request it again once the issue below is resolved.`,
    ],
    sections: [
      {
        type: 'rows',
        rows: [
          ['Reference', payout.referenceNumber],
          ['Amount', formatZAR(payout.amount)],
          ['Declined', formatDate(payout.failedAt || new Date())],
        ],
      },
      {
        type: 'note',
        variant: 'danger',
        text: `Reason: ${reason || payout.failureReason || 'Not specified'}`,
      },
      {
        type: 'note',
        text: 'The most common cause is bank details that do not match the account holder name. Check them in your wallet settings before requesting again.',
      },
    ],
    cta: { label: 'Check bank details', url: url('/dashboard/wallet') },
    tags: ['payout-rejected', 'seller'],
  });
}

export { BRAND };
