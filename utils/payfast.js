// utils/payfast.js - ENHANCED VERSION
import crypto from 'crypto';

const disabledFlags = ['false', '0', 'off', 'disabled', 'no'];

export const isPayFastSignatureRequired = () => {
  const flag = process.env.PAYFAST_REQUIRE_SIGNATURE;
  if (!flag) return true; // default to secure behaviour
  return !disabledFlags.includes(flag.toLowerCase());
};

export const isPayFastITNEnabled = () => {
  const flag = process.env.PAYFAST_ENABLE_ITN;
  if (!flag) return true;
  return !disabledFlags.includes(flag.toLowerCase());
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
 * Generate PayFast payment signature
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
      pfOutput += `${key}=${encodeURIComponent(value.toString().trim()).replace(/%20/g, '+')}&`;
    }
  }

  // Remove last ampersand (handles empty string safely)
  let getString = pfOutput.endsWith('&') ? pfOutput.slice(0, -1) : pfOutput;
  
  // Add passphrase if provided
  if (passPhrase !== null && passPhrase !== '') {
    getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, '+')}`;
  }

  console.log('Signature string:', getString);
  const signature = crypto.createHash('md5').update(getString).digest('hex');
  console.log('Generated signature:', signature);
  
  return signature;
}

/**
 * Create PayFast payment data for orders
 * Handles multiple orders by combining totals
 */
export function createPayFastPayment(orders, returnUrl, cancelUrl, notifyUrl) {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passPhrase = process.env.PAYFAST_PASSPHRASE;
  
  // Use sandbox in development
  const useSandbox = process.env.NODE_ENV !== 'production';

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

  if (isPayFastSignatureRequired()) {
    const sandboxPassphrase = process.env.PAYFAST_SANDBOX_PASSPHRASE;
    const signaturePassphrase = useSandbox
      ? (sandboxPassphrase ?? passPhrase ?? null)
      : (passPhrase ?? null);
    data.signature = generatePayFastSignature(data, signaturePassphrase);
  } else {
    delete data.signature;
  }

  return {
    data,
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

  // Separate signature from data
  const pfSignature = postData.signature;
  delete postData.signature;

  // Generate signature
  const calculatedSignature = generatePayFastSignature(postData, passPhrase);

  // Compare signatures
  return pfSignature === calculatedSignature;
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



