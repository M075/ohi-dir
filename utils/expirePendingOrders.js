// utils/expirePendingOrders.js
//
// Releases stock reserved by abandoned PayFast checkouts.
//
// At checkout an order is created with paymentStatus 'pending' and its stock is
// decremented while the buyer pays on PayFast. A failed payment fires an ITN
// that cancels the order and restores the stock, but a buyer who simply closes
// the PayFast tab produces no notification at all — so without a sweep, that
// stock stays reserved forever and the item looks out of stock to everyone
// else.
//
// This runs from two places:
//
//   1. A Vercel cron job (see vercel.json). On the Hobby plan cron is limited
//      to once per day with ±59 minutes of jitter, which is far too coarse to
//      be the only mechanism.
//   2. Opportunistically, off the back of organic traffic — see
//      maybeExpirePendingOrders(). This is what actually keeps stock accurate
//      on Hobby.
//
// Both paths share this logic, so behaviour can't drift between them.

import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Setting from '@/models/Setting';

const DEFAULT_TIMEOUT_MINUTES = 30;
const DEFAULT_BATCH_LIMIT = 50;

export function getPendingOrderTimeoutMinutes() {
  return Number(process.env.PENDING_ORDER_TIMEOUT_MINUTES) || DEFAULT_TIMEOUT_MINUTES;
}

/**
 * Cancel pending PayFast orders older than the timeout and return their stock.
 *
 * Batched: a backlog is worked through over several passes rather than in one
 * long request, so this stays safe to call from a user-facing route.
 */
export async function expirePendingOrders({ limit = DEFAULT_BATCH_LIMIT } = {}) {
  await connectDB();

  const timeoutMinutes = getPendingOrderTimeoutMinutes();
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // Only the PayFast redirect flow reserves stock up front, so scope to it —
  // e.g. a future cash-on-delivery order shouldn't be auto-cancelled.
  const staleOrders = await Order.find({
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'payfast',
    createdAt: { $lt: cutoff },
  }).limit(limit);

  const cancelledOrderNumbers = [];

  for (const order of staleOrders) {
    // Release reserved stock (guarded so it can never double-restore).
    if (!order.stockRestored) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } }
        );
      }
      order.stockRestored = true;
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason =
      order.cancellationReason || `Payment not completed within ${timeoutMinutes} minutes`;
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Auto-cancelled: payment not completed within ${timeoutMinutes} minutes`,
    });

    await order.save();
    cancelledOrderNumbers.push(order.orderNumber);
  }

  return {
    timeoutMinutes,
    scanned: staleOrders.length,
    cancelled: cancelledOrderNumbers.length,
    cancelledOrderNumbers,
    hasMore: staleOrders.length === limit,
  };
}

/**
 * Run the sweep at most once every `minIntervalMinutes`, across all serverless
 * instances.
 *
 * The interval is claimed with a single conditional update on the Setting
 * document: only the request whose update matches actually does the work, so
 * concurrent traffic doesn't trigger concurrent sweeps. When the claim fails
 * (the common case) this costs one indexed write attempt and returns.
 *
 * Never throws — this is called from routes whose real job is something else,
 * and a failed cleanup must not fail a page load or a checkout.
 */
export async function maybeExpirePendingOrders({
  minIntervalMinutes = 5,
  limit = DEFAULT_BATCH_LIMIT,
} = {}) {
  try {
    await connectDB();

    const claimBefore = new Date(Date.now() - minIntervalMinutes * 60 * 1000);

    // Claim the slot. upsert handles the very first run, when no Setting
    // document exists yet.
    const claimed = await Setting.findOneAndUpdate(
      {
        $or: [
          { lastOrderExpirySweepAt: { $lt: claimBefore } },
          { lastOrderExpirySweepAt: { $exists: false } },
          { lastOrderExpirySweepAt: null },
        ],
      },
      { $set: { lastOrderExpirySweepAt: new Date() } },
      { new: true, upsert: true }
    );

    if (!claimed) return null;

    return await expirePendingOrders({ limit });
  } catch (error) {
    // A duplicate-key error means another instance won the upsert race, which
    // is the expected outcome under concurrency, not a problem.
    if (error?.code !== 11000) {
      console.error('Opportunistic order expiry failed:', error.message);
    }
    return null;
  }
}
