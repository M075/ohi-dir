import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';


// app/api/admin/payments/[orderId]/route.js
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { orderId } = await params;
    const { action, note } = await request.json();

    const order = await Order.findById(orderId);
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'mark_paid':
        order.paymentStatus = 'paid';
        order.paymentDetails = {
          ...order.paymentDetails,
          paidAt: new Date(),
          manuallyMarkedBy: sessionUser.userId
        };
        break;
      case 'refund':
        order.paymentStatus = 'refunded';
        order.statusHistory.push({
          status: 'refunded',
          timestamp: new Date(),
          note: note || 'Refunded by admin'
        });
        break;
      case 'mark_failed':
        order.paymentStatus = 'failed';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    await order.save();

    return new Response(
      JSON.stringify({ order }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin payment action error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

