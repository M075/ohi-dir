// ============================================================================
// FILE 9: utils/walletHelper.js
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
 * Calculate platform fee (15% default)
 */
export function calculatePlatformFee(amount, feePercentage = 15) {
  return (amount * feePercentage) / 100;
}

/**
 * Process order payment - add to wallet
 */
export async function processOrderPayment(order) {
  const wallet = await getOrCreateWallet(order.seller);
  
  const platformFee = calculatePlatformFee(order.subtotal);
  
  await wallet.addTransaction({
    type: 'sale',
    amount: order.subtotal,
    fee: platformFee,
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
  calculatePlatformFee,
  processOrderPayment,
  completeOrderPayment,
  processRefund,
};