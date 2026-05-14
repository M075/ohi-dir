// ============================================================================
// utils/walletHelper.js — Wallet helpers with dynamic commission & ledger
// ============================================================================
import Wallet from '@/models/Wallet';

/**
 * Create or get wallet for seller
 */
export async function getOrCreateWallet(sellerId) {
  let wallet = await Wallet.findOne({ seller: sellerId });
  
  if (!wallet) {
    wallet = await Wallet.create({
      seller: sellerId,
    });
  }
  
  return wallet;
}

/**
 * Get the commission percentage from the admin settings.
 * Falls back to 15% if the setting doesn't exist yet.
 */
export async function getCommissionPercentage() {
  const Setting = (await import('@/models/Setting')).default;
  const settings = await Setting.findOne();
  return settings?.commissionPercentage ?? 15;
}

/**
 * Calculate platform fee from a given amount and percentage
 */
export function calculatePlatformFee(amount, feePercentage) {
  // If no percentage is provided, fall back to 15 (legacy callers)
  const pct = typeof feePercentage === 'number' ? feePercentage : 15;
  return (amount * pct) / 100;
}

/**
 * Record ledger entries for a paid order — 3-way split:
 *  1. buyer_payment   (debit)  — the total the buyer paid
 *  2. platform_commission (credit) — admin's commission on subtotal
 *  3. seller_earnings  (credit) — subtotal minus commission minus shipping
 *  4. shipping_*       (credit) — shipping amount, tagged by courier type
 *  5. tax_collected    (credit) — tax portion (if any)
 */
export async function recordLedgerEntries(order, commissionPercentage) {
  const LedgerEntry = (await import('@/models/LedgerEntry')).default;

  // Check for existing ledger entries (idempotent — don't double-record)
  const existing = await LedgerEntry.findOne({ order: order._id, account: 'buyer_payment' });
  if (existing) {
    return; // already recorded
  }

  const commission = calculatePlatformFee(order.subtotal, commissionPercentage);
  const shippingAmount = order.shipping || 0;
  const sellerEarnings = order.subtotal - commission - shippingAmount;

  const taxAmount = order.tax || 0;

  // Determine shipping account based on fulfillment option
  let shippingAccount = 'shipping_collection';
  if (order.fulfillmentOption === 'door-to-door') {
    shippingAccount = 'shipping_courier_guy';
  } else if (order.fulfillmentOption === 'pudo') {
    shippingAccount = 'shipping_pudo';
  }

  const entries = [
    // 1. Buyer payment — debit (money coming in)
    {
      order: order._id,
      orderNumber: order.orderNumber,
      account: 'buyer_payment',
      type: 'debit',
      amount: order.total,
      seller: order.seller,
      buyer: order.buyer,
      description: `Payment received for order ${order.orderNumber}`,
      metadata: { paymentMethod: order.paymentMethod },
    },
    // 2. Platform commission — credit
    {
      order: order._id,
      orderNumber: order.orderNumber,
      account: 'platform_commission',
      type: 'credit',
      amount: commission,
      seller: order.seller,
      buyer: order.buyer,
      description: `Platform commission (${commissionPercentage}%) on order ${order.orderNumber}`,
      metadata: { commissionPercentage, subtotal: order.subtotal },
    },
    // 3. Seller earnings — credit
    {
      order: order._id,
      orderNumber: order.orderNumber,
      account: 'seller_earnings',
      type: 'credit',
      amount: sellerEarnings,
      seller: order.seller,
      buyer: order.buyer,
      description: `Seller earnings for order ${order.orderNumber}`,
      metadata: { commissionPercentage, grossAmount: order.subtotal, commission, shippingDeducted: shippingAmount },
    },
  ];

  // 4. Shipping cost — credit (only if > 0)
  if (shippingAmount > 0) {
    entries.push({
      order: order._id,
      orderNumber: order.orderNumber,
      account: shippingAccount,
      type: 'credit',
      amount: shippingAmount,
      seller: order.seller,
      buyer: order.buyer,
      description: `Shipping cost (${order.fulfillmentOption}) for order ${order.orderNumber}`,
      metadata: {
        fulfillmentOption: order.fulfillmentOption,
        courierProvider: order.courierProvider || null,
      },
    });
  }

  // 5. Tax collected — credit (only if > 0)
  if (taxAmount > 0) {
    entries.push({
      order: order._id,
      orderNumber: order.orderNumber,
      account: 'tax_collected',
      type: 'credit',
      amount: taxAmount,
      seller: order.seller,
      buyer: order.buyer,
      description: `Tax (VAT) collected for order ${order.orderNumber}`,
    });
  }

  await LedgerEntry.insertMany(entries);
}

/**
 * Process order payment - add to wallet
 */
export async function processOrderPayment(order, commissionPercentage) {
  const wallet = await getOrCreateWallet(order.seller);
  
  const pct = typeof commissionPercentage === 'number'
    ? commissionPercentage
    : await getCommissionPercentage();
  const platformFee = calculatePlatformFee(order.subtotal, pct);
  const shippingCost = order.shipping || 0;
  // Total deductions = commission + shipping so seller net = subtotal - commission - shipping
  const totalDeductions = platformFee + shippingCost;
  
  await wallet.addTransaction({
    type: 'sale',
    amount: order.total,
    fee: totalDeductions,
    status: 'pending', // Pending until order delivered
    description: `Order Sale - ${order.orderNumber}`,
    order: order._id,
    buyer: order.buyer,
    paymentMethod: order.paymentMethod,
  });
  
  return wallet;
}

/**
 * Complete order - move from pending to available
 */
export async function completeOrderPayment(orderId) {
  const Order = (await import('@/models/Order')).default;
  const order = await Order.findById(orderId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  const wallet = await Wallet.findOne({ seller: order.seller });
  
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  
  const pendingTx = wallet.transactions.find(
    t => t.order?.toString() === orderId.toString() && 
         t.status === 'pending' && 
         t.type === 'sale'
  );
  
  if (pendingTx) {
    await wallet.completeTransaction(pendingTx._id);
  }
  
  return wallet;
}

/**
 * Process refund
 */
export async function processRefund(order, reason) {
  const wallet = await getOrCreateWallet(order.seller);
  
  await wallet.addTransaction({
    type: 'refund',
    amount: -order.total,
    fee: 0,
    status: 'completed',
    description: `Refund - ${order.orderNumber}`,
    order: order._id,
    buyer: order.buyer,
    metadata: { reason },
  });
  
  return wallet;
}

export default {
  getOrCreateWallet,
  getCommissionPercentage,
  calculatePlatformFee,
  recordLedgerEntries,
  processOrderPayment,
  completeOrderPayment,
  processRefund,
};