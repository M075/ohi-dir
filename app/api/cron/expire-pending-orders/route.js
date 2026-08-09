// app/api/cron/expire-pending-orders/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';

/**
 * Scheduled cleanup for abandoned PayFast checkouts.
 *
 * At checkout an order is created with paymentStatus 'pending' and stock is
 * reserved (decremented) while the buyer pays on PayFast. A failed/cancelled
 * payment normally fires an ITN that cancels the order and restores stock, but
 * if the buyer simply abandons the PayFast page and no ITN ever arrives, the
 * order — and its reserved stock — would be stuck 'pending' forever. This job
 * cancels orders left pending past a timeout and returns their stock.
 *
 * Triggered by Vercel Cron (see vercel.json). Vercel automatically sends
 * `Authorization: Bearer <CRON_SECRET>` on cron requests, so set CRON_SECRET in
 * the project's environment variables to enable this endpoint.
 *
 * Note on the timeout: choose a value comfortably beyond a PayFast session's
 * lifetime so a buyer who is still mid-payment is never cancelled from under
 * them. Configurable via PENDING_ORDER_TIMEOUT_MINUTES (default 30).
 */

// Route handlers can be cached by Next; force this one to run on every request.
export const dynamic = 'force-dynamic';

const DEFAULT_TIMEOUT_MINUTES = 30;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  // If no secret is configured, refuse rather than run unauthenticated.
  if (!secret) return false;
  const authHeader = request.headers.get('authorization') || '';
  return authHeader === `Bearer ${secret}`;
}

async function expirePendingOrders() {
  await connectDB();

  const timeoutMinutes = Number(process.env.PENDING_ORDER_TIMEOUT_MINUTES) || DEFAULT_TIMEOUT_MINUTES;
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // Only the PayFast redirect flow reserves stock up front, so scope to it —
  // e.g. a future cash-on-delivery order shouldn't be auto-cancelled.
  const staleOrders = await Order.find({
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'payfast',
    createdAt: { $lt: cutoff },
  });

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
  };
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const result = await expirePendingOrders();
    console.log('⏰ Expire pending orders:', result);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Expire pending orders error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to expire pending orders' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
