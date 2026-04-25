// ============================================================================
// FILE 8: app/api/orders/webhook/route.js (Order completion webhook)
// ============================================================================
import connectDB from '@/config/database';
import Order from '@/models/Order';
import Wallet from '@/models/Wallet';

// POST - Webhook to update wallet when order status changes
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { orderId, status, paymentStatus } = body;

    const order = await Order.findById(orderId)
      .populate('seller', 'storename email')
      .populate('buyer', 'storename email');

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find or create seller's wallet
    let wallet = await Wallet.findOne({ seller: order.seller._id });
    
    if (!wallet) {
      wallet = await Wallet.create({
        seller: order.seller._id,
      });
    }

    // Handle different order statuses
    if (paymentStatus === 'paid' && status === 'processing') {
      // Add sale transaction (pending until order delivered)
      await wallet.addTransaction({
        type: 'sale',
        amount: order.subtotal, // Use subtotal (before shipping & tax)
        fee: order.subtotal * 0.15, // 15% platform fee
        status: 'pending',
        description: `Order Sale - ${order.orderNumber}`,
        order: order._id,
        buyer: order.buyer._id,
        paymentMethod: order.paymentMethod,
        metadata: {
          orderNumber: order.orderNumber,
          itemCount: order.items.length,
        },
      });
    } else if (status === 'delivered') {
      // Find the pending transaction and complete it
      const pendingTx = wallet.transactions.find(
        t => t.order?.toString() === order._id.toString() && 
             t.status === 'pending' && 
             t.type === 'sale'
      );
      
      if (pendingTx) {
        await wallet.completeTransaction(pendingTx._id);
      }
    } else if (status === 'cancelled' && paymentStatus === 'paid') {
      // Handle refund
      await wallet.addTransaction({
        type: 'refund',
        amount: -order.total,
        fee: 0,
        status: 'completed',
        description: `Refund - ${order.orderNumber}`,
        order: order._id,
        buyer: order.buyer._id,
        metadata: {
          orderNumber: order.orderNumber,
          reason: order.cancellationReason,
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


