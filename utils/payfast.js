// utils/payfast.js - ENHANCED VERSION
import crypto from 'crypto';

const disabledFlags = ['false', '0', 'off', 'disabled', 'no'];

/**
 * Signature verification and ITN processing can be switched off for local
 * experimentation, but ONLY in sandbox. In live mode the flags are ignored:
 * turning them off there means real money moves with nothing on our side
 * confirming it, so the switches are deliberately unreachable.
 */
export const isPayFastSignatureRequired = () => {
  if (!isPayFastSandbox()) return true;
  const flag = process.env.PAYFAST_REQUIRE_SIGNATURE;
  if (!flag) return true; // default to secure behaviour
  return !disabledFlags.includes(flag.toLowerCase());
};

export const isPayFastITNEnabled = () => {
  if (!isPayFastSandbox()) return true;
  const flag = process.env.PAYFAST_ENABLE_ITN;
  if (!flag) return true;
  return !disabledFlags.includes(flag.toLowerCase());
};

/**
 * Decide whether to use the PayFast sandbox.
 *
 * IMPORTANT: this intentionally does NOT rely on NODE_ENV. Next.js controls
 * NODE_ENV from the run command (`next dev` = development, `next start` =
 * production) and ignores any NODE_ENV you set in .env files, so it can't be
 * used as a live/sandbox switch. Use an explicit variable instead:
 *
 *   PAYFAST_MODE=live        -> production (also: production | prod)
 *   PAYFAST_MODE=sandbox     -> sandbox (also: test)
 *   PAYFAST_SANDBOX=false    -> production (also: 0 | off | no | disabled)
 *   PAYFAST_SANDBOX=true     -> sandbox
 *
 * If neither is set, falls back to the old behaviour (sandbox unless the
 * process itself is running in production).
 */
export const isPayFastSandbox = () => {
  const mode = (process.env.PAYFAST_MODE || '').toLowerCase().trim();
  if (mode === 'live' || mode === 'production' || mode === 'prod') return false;
  if (mode === 'sandbox' || mode === 'test') return true;

  const flag = (process.env.PAYFAST_SANDBOX || '').toLowerCase().trim();
  if (flag) return !disabledFlags.includes(flag);

  // Backwards-compatible fallback.
  return process.env.NODE_ENV !== 'production';
};

// Field order prescribed by PayFast documentation (Custom Integration -> Step 2)
const PAYFAST_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'billing_date',
  'recurring_amount',
  'frequency',
  'cycles',
  'subscription_notify_email',
  'subscription_notify_webhook',
  'subscription_notify_buyer',
];

/**
 * Encode a value exactly like PHP's urlencode(), which is what PayFast uses to
 * rebuild and verify the signature on their side. JavaScript's
 * encodeURIComponent() leaves ! ' ( ) * ~ unescaped and encodes spaces as %20,
 * whereas PHP encodes those characters and uses '+' for spaces. If we don't
 * match PHP, our MD5 differs from PayFast's and the payment is rejected (403 /
 * "signature mismatch"). This bites in practice on item_description, which
 * contains "seller(s)".
 */
export function pfUrlEncode(value) {
  return encodeURIComponent(value.toString().trim())
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E');
}

/**
 * Reorder a payment payload into PayFast's prescribed field order.
 *
 * This matters more than it looks. PayFast rebuilds the signature from the
 * fields exactly as they arrive in the POST body, so the order we *sign* in
 * and the order we *submit* in have to be identical. The browser builds its
 * form with Object.entries(), i.e. insertion order — so the payload object
 * itself must already be in signing order before it leaves the server.
 * Otherwise PayFast rejects the payment with a signature error at
 * /eng/process.
 *
 * Values are trimmed here too, because pfUrlEncode() trims before hashing: an
 * untrimmed value would be signed in its trimmed form but submitted with the
 * whitespace intact, and mismatch for that reason alone.
 */
export function orderPayFastFields(data) {
  const ordered = {};

  const put = (key) => {
    const value = data[key];
    if (value === '' || value === null || value === undefined) return;
    ordered[key] = typeof value === 'string' ? value.trim() : value;
  };

  PAYFAST_FIELD_ORDER.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== 'signature') put(key);
  });

  // Anything not in the prescribed list keeps its relative order at the end.
  Object.keys(data).forEach(key => {
    if (key === 'signature' || Object.prototype.hasOwnProperty.call(ordered, key)) return;
    put(key);
  });

  return ordered;
}

/**
 * Generate a PayFast signature over key/value pairs in the order given.
 *
 * Order is the caller's responsibility because the two use sites disagree:
 * outbound payments use PayFast's prescribed field order, while ITN
 * verification must use the order the fields arrived in.
 */
export function generateSignatureFromPairs(pairs, passPhrase = null) {
  let pfOutput = '';
  for (const [key, value] of pairs) {
    if (key === 'signature') continue;
    if (value !== '' && value !== null && value !== undefined) {
      pfOutput += `${key}=${pfUrlEncode(value)}&`;
    }
  }

  let getString = pfOutput.endsWith('&') ? pfOutput.slice(0, -1) : pfOutput;

  if (passPhrase !== null && passPhrase !== '') {
    getString += `&passphrase=${pfUrlEncode(passPhrase)}`;
  }

  // NOTE: never log `getString` — it contains the merchant passphrase in clear
  // text, which is enough to forge payment notifications.
  return crypto.createHash('md5').update(getString).digest('hex');
}

/**
 * Generate PayFast payment signature using the prescribed field order.
 */
export function generatePayFastSignature(data, passPhrase = null) {
  // Create parameter string using the PayFast prescribed order
  const orderedPairs = [];
  const processedKeys = new Set();

  PAYFAST_FIELD_ORDER.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== 'signature') {
      orderedPairs.push([key, data[key]]);
      processedKeys.add(key);
    }
  });

  Object.keys(data).forEach(key => {
    if (key === 'signature' || processedKeys.has(key)) return;
    orderedPairs.push([key, data[key]]);
  });

  let pfOutput = '';
  for (const [key, value] of orderedPairs) {
    if (value !== '' && value !== null && value !== undefined) {
      pfOutput += `${key}=${pfUrlEncode(value)}&`;
    }
  }

  // Remove last ampersand (handles empty string safely)
  let getString = pfOutput.endsWith('&') ? pfOutput.slice(0, -1) : pfOutput;

  // Add passphrase if provided
  if (passPhrase !== null && passPhrase !== '') {
    getString += `&passphrase=${pfUrlEncode(passPhrase)}`;
  }

  // NOTE: never log `getString` — it contains the merchant passphrase in clear
  // text, which is enough to forge payment notifications.
  return crypto.createHash('md5').update(getString).digest('hex');
}

/**
 * Resolve the passphrase to use for a given payload. Sandbox and live
 * merchants have separate passphrases configured in the PayFast dashboard.
 */
export function getPayFastPassphrase(useSandbox = isPayFastSandbox()) {
  if (useSandbox) {
    return process.env.PAYFAST_SANDBOX_PASSPHRASE
      ?? process.env.PAYFAST_PASSPHRASE
      ?? null;
  }
  return process.env.PAYFAST_PASSPHRASE ?? null;
}

/**
 * Create PayFast payment data for orders
 * Handles multiple orders by combining totals
 */
export function createPayFastPayment(orders, returnUrl, cancelUrl, notifyUrl) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;

  // Sandbox vs live is driven by an explicit env var, NOT NODE_ENV.
  const useSandbox = isPayFastSandbox();

  // Fail loudly rather than posting a form with `undefined` merchant details,
  // which PayFast rejects with an unhelpful error the buyer sees.
  if (!useSandbox && (!merchantId || !merchantKey)) {
    throw new Error(
      'PayFast live mode is enabled but PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY are missing.'
    );
  }

  const passPhrase = getPayFastPassphrase(useSandbox);

  if (!useSandbox && !passPhrase) {
    console.warn(
      '⚠️ PayFast live mode has no PAYFAST_PASSPHRASE set. If a passphrase is ' +
      'configured on the PayFast dashboard, every signature will mismatch.'
    );
  }

  // Handle single order or array of orders
  const orderArray = Array.isArray(orders) ? orders : [orders];
  
  // Calculate combined totals
  const totalAmount = orderArray.reduce((sum, order) => sum + order.total, 0);
  const itemCount = orderArray.reduce((sum, order) => sum + order.items.length, 0);
  
  // Get first order for reference data
  const firstOrder = orderArray[0];
  
  // Create order numbers string
  const orderNumbers = orderArray.map(o => o.orderNumber).join(', ');
  
  // Get buyer details
  const fullName = firstOrder.shippingAddress?.fullName || 
                   firstOrder.user?.storename || 
                   'Customer';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'User';
  
  const email = firstOrder.shippingAddress?.email || 
                firstOrder.buyerEmail || 
                firstOrder.user?.email || 
                'noreply@example.com';
  
  const phone = firstOrder.shippingAddress?.phone || '';

  const data = {
    // Merchant details
    merchant_id: useSandbox ? '10000100' : merchantId,
    merchant_key: useSandbox ? '46f0cd694581a' : merchantKey,
    
    // URLs
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    
    // Buyer details
    name_first: firstName,
    name_last: lastName,
    email_address: email,
    
    // Transaction details
    m_payment_id: orderNumbers,
    amount: totalAmount.toFixed(2),
    item_name: orderArray.length > 1 
      ? `${orderArray.length} Orders` 
      : `Order #${firstOrder.orderNumber}`,
    item_description: `${itemCount} items from ${orderArray.length} seller(s)`,
    
    // Optional - store order IDs for reference
    custom_str1: orderArray.map(o => o._id.toString()).join(','),
    custom_int1: orderArray.length,
    custom_int2: itemCount,
  };

  // Only add cell_number if it exists and is not empty
  if (phone && phone.replace(/\s/g, '')) {
    data.cell_number = phone.replace(/\s/g, '');
  }

  // Normalise into PayFast's prescribed order BEFORE signing, so the order we
  // hash is the order the browser posts. See orderPayFastFields().
  const payload = orderPayFastFields(data);

  if (isPayFastSignatureRequired()) {
    payload.signature = generateSignatureFromPairs(Object.entries(payload), passPhrase);
  }

  return {
    data: payload,
    url: useSandbox
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process',
  };
}

/**
 * Verify PayFast payment notification (ITN)
 */
export function verifyPayFastPayment(postData, passPhrase = null) {
  if (!isPayFastSignatureRequired()) {
    return true;
  }

  // Accepts either the ordered [key, value] pairs as received, or a plain
  // object. Prefer the pairs: PayFast builds the ITN signature from the
  // fields in the order they appear in the POST body, NOT the prescribed
  // order used for outbound payments. Reordering them here made every genuine
  // notification fail verification.
  const pairs = Array.isArray(postData) ? postData : Object.entries(postData);

  const signatureEntry = pairs.find(([key]) => key === 'signature');
  const pfSignature = signatureEntry?.[1];

  // Copy rather than mutate: the caller still needs the untouched payload
  // (signature included) to POST back to PayFast for server confirmation.
  const calculatedSignature = generateSignatureFromPairs(pairs, passPhrase);

  return timingSafeEquals(pfSignature, calculatedSignature);
}

/**
 * Constant-time string comparison, so a caller can't learn the expected
 * signature byte-by-byte from response timing.
 */
function timingSafeEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Step 3 of PayFast's ITN security checklist: confirm the notification with
 * PayFast's own servers.
 *
 * The signature check (step 1) proves the payload was signed with our
 * passphrase; the IP check (step 2) is spoofable and PayFast rotate their
 * ranges. Only this POST-back proves PayFast actually sent it, so it is the
 * check that ultimately gates crediting an order. Send the payload back
 * exactly as received — same fields, same order, signature included.
 *
 * Returns true only on an explicit "VALID" response.
 */
export async function validatePayFastITN(rawPairs, { timeoutMs = 10000 } = {}) {
  const host = isPayFastSandbox()
    ? 'https://sandbox.payfast.co.za'
    : 'https://www.payfast.co.za';

  const body = rawPairs
    .map(([key, value]) => `${key}=${pfUrlEncode(value)}`)
    .join('&');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${host}/eng/query/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error('PayFast validate returned HTTP', response.status);
      return false;
    }

    const text = (await response.text()).trim();
    return text.toUpperCase().startsWith('VALID');
  } catch (error) {
    // A network failure is not a validation — treat it as untrusted and let
    // PayFast retry the notification.
    console.error('PayFast validate request failed:', error.message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Validate PayFast IP address (for ITN security)
 */
export function isValidPayFastIP(ipAddress) {
  const validIPs = [
    '197.97.145.144',
    '197.97.145.145',
    '197.97.145.146',
    '197.97.145.147',
    '197.97.145.148',
    '197.97.145.149',
    '197.97.145.150',
    '197.97.145.151',
    '197.97.145.152',
    '197.97.145.153',
    // Sandbox IPs
    '41.74.179.194',
    '41.74.179.195',
    '41.74.179.196',
    '41.74.179.197',
  ];

  return validIPs.includes(ipAddress);
}

/**
 * Parse PayFast payment status
 */
export function parsePayFastStatus(paymentStatus) {
  const statusMap = {
    'COMPLETE': 'paid',
    'FAILED': 'failed',
    'PENDING': 'pending',
    'CANCELLED': 'failed',
  };

  return statusMap[paymentStatus] || 'pending';
}

/**
 * Generate PayFast payment form HTML (client-side submission)
 */
export function generatePayFastForm(paymentData) {
  const { data, url } = paymentData;
  
  let formHtml = `<form id="payfast-form" action="${url}" method="post">`;
  
  for (const [key, value] of Object.entries(data)) {
    formHtml += `<input type="hidden" name="${key}" value="${value}" />`;
  }
  
  formHtml += '</form>';
  
  return formHtml;
}

/**
 * Create PayFast payment URL with query parameters (for GET redirect)
 */
export function createPayFastUrl(paymentData) {
  const { data, url } = paymentData;
  const params = new URLSearchParams(data);
  return `${url}?${params.toString()}`;
}



