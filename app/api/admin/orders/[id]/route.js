// app/api/admin/orders/[id]/route.js - Admin order actions API
import connectDB from '@/config/database';
import Order from '@/models/Order';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

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
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    const { action, status: newStatus, reason } = await request.json();

    const order = await Order.findById(id);
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {
      case 'cancel':
        if (['delivered', 'cancelled'].includes(order.status)) {
          return new Response(
            JSON.stringify({ error: 'Cannot cancel this order' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = reason || 'Cancelled by admin';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: `Cancelled by admin: ${reason || 'No reason provided'}`
        });
        break;
        
      case 'update_status':
        if (!newStatus) {
          return new Response(
            JSON.stringify({ error: 'New status is required' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
        if (!validStatuses.includes(newStatus)) {
          return new Response(
            JSON.stringify({ error: 'Invalid status' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        
        order.status = newStatus;
        
        // Set timestamp based on status
        if (newStatus === 'confirmed') order.confirmedAt = new Date();
        if (newStatus === 'shipped') order.shippedAt = new Date();
        if (newStatus === 'delivered') order.deliveredAt = new Date();
        
        order.statusHistory.push({
          status: newStatus,
          timestamp: new Date(),
          note: `Status updated by admin`
        });
        break;
        
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    await order.save();

    return new Response(
      JSON.stringify({ 
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        message: `Order ${action === 'cancel' ? 'cancelled' : 'updated'} successfully`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin order action error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

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

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    
    const order = await Order.findById(id)
      .populate('buyer', 'storename email image phone')
      .populate('seller', 'storename email image')
      .populate('items.product', 'title images price');
      
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ order }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin order GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
