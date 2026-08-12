// app/api/payment/verify/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

/**
 * Order status lookup for the PayFast return URL.
 *
 * IMPORTANT: this endpoint is deliberately READ-ONLY.
 *
 * PayFast's return_url is just a browser redirect. Nothing in it is signed, so
 * a request arriving here proves nothing about whether money actually moved —
 * a buyer can navigate straight to /payment/success without paying at all.
 * This route used to mark orders paid, credit the seller's wallet and book a
 * courier shipment on the strength of that redirect, which meant anyone who
 * knew an order number could take goods for free.
 *
 * The ITN handler (app/api/payment/payfast/notify) is the only writer of
 * payment state, because it is the only path PayFast signs and confirms. Here
 * we report what that handler has recorded so far, and the client polls until
 * it lands.
 */

const jsonResponse = (data, status = 200) => new Response(
  JSON.stringify(data),
  {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  },
);

export async function POST(request) {
  try {
    await connectDB();

    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid request format' }, 400);
    }

    const { paymentId } = body || {};

    if (!paymentId || typeof paymentId !== 'string') {
      return jsonResponse({ error: 'Payment ID required' }, 400);
    }

    // A payment can cover several orders (one per seller), passed as a
    // comma-separated list of order numbers. Cap the count so this can't be
    // used to sweep the collection.
    const orderNumbers = paymentId
      .split(',')
      .map(n => n.trim())
      .filter(Boolean)
      .slice(0, 20);

    if (!orderNumbers.length) {
      return jsonResponse({ error: 'Payment ID required' }, 400);
    }

    // Scope the query to the signed-in buyer. An order number belonging to
    // someone else simply doesn't exist as far as this endpoint is concerned.
    const orders = await Order.find({
      orderNumber: { $in: orderNumbers },
      buyer: sessionUser.userId,
    }).select('orderNumber status paymentStatus total createdAt');

    if (!orders.length) {
      return jsonResponse({ error: 'Orders not found' }, 404);
    }

    const allPaid = orders.every(o => o.paymentStatus === 'paid');
    const anyFailed = orders.some(o => o.paymentStatus === 'failed');
    const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Tell the client whether waiting longer could still change the answer.
    // PayFast normally delivers the ITN within seconds, but it retries over a
    // longer window, so 'pending' is not yet a failure.
    let paymentState = 'pending';
    if (allPaid) paymentState = 'paid';
    else if (anyFailed) paymentState = 'failed';

    return jsonResponse({
      success: true,
      paymentState,
      pending: paymentState === 'pending',
      orderNumbers: orders.map(o => o.orderNumber).join(', '),
      amount: totalAmount.toFixed(2),
      orders: orders.map(o => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
      })),
    });

  } catch (error) {
    console.error('Payment status lookup error:', error);
    return jsonResponse({ error: 'Failed to load order status' }, 500);
  }
}
