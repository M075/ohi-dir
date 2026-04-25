// app/api/orders/[id]/status/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { getOrCreateWallet, calculatePlatformFee } from '@/utils/walletHelper';
import { createShiplogicShipmentFromOrder } from '@/utils/courierServices';

// Helper function to send email notifications
async function sendStatusUpdateEmail(order, buyer, seller) {
  // TODO: Implement email notification
  console.log(`📧 Email notification needed for order ${order.orderNumber}`);
  
  // Example structure:
  // - Order confirmed → Send to buyer & seller
  // - Order shipped → Send tracking info to buyer
  // - Order delivered → Ask for review
  // - Order cancelled → Notify both parties
}

// PUT - Update order status
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { status, trackingNumber, trackingUrl, courierProvider, notes } = body;

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find order
    const order = await Order.findById(id)
      .populate('buyer', 'storename email')
      .populate('seller', 'storename email');

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authorization check
    const user = await User.findById(sessionUser.userId);
    const isAdmin = user?.isAdmin;
    const isSeller = order.seller._id.toString() === sessionUser.userId;
    const isBuyer = order.buyer._id.toString() === sessionUser.userId;

    // Sellers can update certain statuses, buyers can cancel/confirm delivery
    if (!isAdmin && !isSeller && !isBuyer) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to update this order' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Status-specific authorization
    if (status === 'confirmed' || status === 'processing' || status === 'shipped') {
      if (!isSeller && !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Only seller can update to this status' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (status === 'delivered') {
      if (!isBuyer && !isAdmin && !isSeller) {
        return new Response(
          JSON.stringify({ error: 'Only buyer, seller, or admin can mark as delivered' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (status === 'cancelled') {
      // Allow cancellation only if order is pending or confirmed
      if (!['pending', 'confirmed'].includes(order.status)) {
        return new Response(
          JSON.stringify({ error: 'Cannot cancel order at this stage' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Store previous status
    const previousStatus = order.status;

    // Update order status
    order.status = status;

    // Update timestamps based on status
    switch (status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        break;
      case 'shipped':
        order.shippedAt = new Date();
        if (trackingNumber) order.trackingNumber = trackingNumber;
        if (trackingUrl) order.trackingUrl = trackingUrl;
        if (courierProvider) order.courierProvider = courierProvider;
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        if (notes) order.cancellationReason = notes;
        
        // Restore product stock if order is cancelled
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } }
          );
        }
        break;
    }

    // Add to status history
    if (previousStatus !== status) {
      order.statusHistory.push({
        status,
        timestamp: new Date(),
        note: notes || `Status changed from ${previousStatus} to ${status}`,
      });
    }

    // Add seller notes if provided
    if (notes && status !== 'cancelled') {
      order.sellerNotes = order.sellerNotes 
        ? `${order.sellerNotes}\n${notes}` 
        : notes;
    }

    await order.save();

    // Inline wallet updates to avoid relying on outbound webhook calls
    if (order.paymentStatus === 'paid') {
      const wallet = await getOrCreateWallet(order.seller._id);

      if (status === 'processing') {
        const existingSaleTx = wallet.transactions.find(
          t => t.order?.toString() === order._id.toString() && t.type === 'sale'
        );
        if (!existingSaleTx) {
          const platformFee = calculatePlatformFee(order.subtotal);
          await wallet.addTransaction({
            type: 'sale',
            amount: order.subtotal,
            fee: platformFee,
            status: 'pending',
            description: `Order Sale - ${order.orderNumber}`,
            order: order._id,
            buyer: order.buyer,
            paymentMethod: order.paymentMethod,
            metadata: {
              orderNumber: order.orderNumber,
              source: 'order-status-processing',
            },
          });
        }
      }

      if (status === 'delivered') {
        const pendingTx = wallet.transactions.find(
          t => t.order?.toString() === order._id.toString() && t.status === 'pending' && t.type === 'sale'
        );
        if (pendingTx) {
          await wallet.completeTransaction(pendingTx._id);
        }
      }

      if (status === 'cancelled') {
        await wallet.addTransaction({
          type: 'refund',
          amount: -order.total,
          fee: 0,
          status: 'completed',
          description: `Refund - ${order.orderNumber}`,
          order: order._id,
          buyer: order.buyer,
          metadata: {
            orderNumber: order.orderNumber,
            reason: order.cancellationReason,
          },
        });
      }
    }

    let trackingUpdated = false;

    // Auto-create Shiplogic shipment when moving to processing and no tracking exists
    if (status === 'processing' && order.paymentStatus === 'paid' && !order.trackingNumber) {
      try {
        const shipment = await createShiplogicShipmentFromOrder(order);
        if (shipment?.trackingReference) {
          order.trackingNumber = shipment.trackingReference;
          order.courierProvider = 'shiplogic';
          order.courierReference = shipment.shipmentId || shipment.trackingReference;
          order.trackingUrl = shipment.labelUrl || order.trackingUrl;
          trackingUpdated = true;
        }
      } catch (shipErr) {
        console.error('Shiplogic shipment create failed:', shipErr.message);
        // Do not block status update on shipment failure
      }
    }

    if (trackingUpdated) {
      await order.save();
    }

    // Send email notifications
    await sendStatusUpdateEmail(order, order.buyer, order.seller);

    // Return updated order
    return new Response(
      JSON.stringify({
        success: true,
        message: `Order status updated to ${status}`,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          courierProvider: order.courierProvider,
          courierReference: order.courierReference,
          confirmedAt: order.confirmedAt,
          shippedAt: order.shippedAt,
          deliveredAt: order.deliveredAt,
          cancelledAt: order.cancelledAt,
          statusHistory: order.statusHistory,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order status update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PATCH - Partial update (for adding tracking info without changing status)
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

    const { id } = params;
    const body = await request.json();

    const order = await Order.findById(id);

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is seller or admin
    const user = await User.findById(sessionUser.userId);
    const isAdmin = user?.isAdmin;
    const isSeller = order.seller.toString() === sessionUser.userId;

    if (!isSeller && !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update allowed fields
    const allowedUpdates = ['trackingNumber', 'trackingUrl', 'courierProvider', 'courierReference', 'sellerNotes', 'estimatedDelivery'];
    
    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        order[field] = body[field];
      }
    }

    await order.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Order updated successfully',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          courierProvider: order.courierProvider,
          courierReference: order.courierReference,
          estimatedDelivery: order.estimatedDelivery,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET - Get order status details
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

    const { id } = params;

    const order = await Order.findById(id)
      .populate('buyer', 'storename email')
      .populate('seller', 'storename email')
      .select('orderNumber status statusHistory trackingNumber trackingUrl courierProvider courierReference shippedAt deliveredAt cancelledAt estimatedDelivery');

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const user = await User.findById(sessionUser.userId);
    const isAdmin = user?.isAdmin;
    const isSeller = order.seller._id.toString() === sessionUser.userId;
    const isBuyer = order.buyer._id.toString() === sessionUser.userId;

    if (!isAdmin && !isSeller && !isBuyer) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ order }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get order status error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}