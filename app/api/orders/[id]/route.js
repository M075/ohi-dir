// app/api/orders/[id]/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Get single order
export async function GET(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;

    const order = await Order.findById(id)
      .populate('buyer', 'storename email phone')
      .populate('seller', 'storename email phone')
      .populate('items.product', 'title images price');

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is buyer or seller
    const isBuyer = order.buyer._id.toString() === sessionUser.userId;
    const isSeller = order.seller._id.toString() === sessionUser.userId;

    if (!isBuyer && !isSeller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Order GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - Update order status (seller only)
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

    const { id } = await params;
    const body = await request.json();
    const { status, trackingNumber, sellerNotes } = body;

    const order = await Order.findById(id);

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is seller
    if (order.seller.toString() !== sessionUser.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Only seller can update order' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update order
    if (status) {
      order.status = status;
      
      // Update timestamps based on status
      if (status === 'confirmed' && !order.confirmedAt) {
        order.confirmedAt = new Date();
      } else if (status === 'shipped' && !order.shippedAt) {
        order.shippedAt = new Date();
      } else if (status === 'delivered' && !order.deliveredAt) {
        order.deliveredAt = new Date();
      } else if (status === 'cancelled' && !order.cancelledAt) {
        order.cancelledAt = new Date();
      }
    }

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (sellerNotes !== undefined) {
      order.sellerNotes = sellerNotes;
    }

    await order.save();

    return new Response(JSON.stringify(order), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Order update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}