// app/api/payment/verify/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getOrCreateWallet, calculatePlatformFee } from '@/utils/walletHelper';

export async function POST(request) {
  try {
    await connectDB();
    
    const { paymentId } = await request.json();
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Payment ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying payment for:', paymentId);

    // Payment ID can be a single order or comma-separated orders
    const orderNumbers = paymentId.split(',').map(n => n.trim());
    
    // Find orders
    const orders = await Order.find({
      orderNumber: { $in: orderNumbers }
    });

    if (orders.length === 0) {
      console.error('Orders not found:', orderNumbers);
      return new Response(
        JSON.stringify({ error: 'Orders not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${orders.length} order(s)`);

    // Calculate total amount
    const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

    // Check if payment status needs to be updated
    // (ITN handler should have already updated it, but this is a fallback)
    const pendingOrders = orders.filter(o => o.paymentStatus === 'pending');
    if (pendingOrders.length > 0) {
      console.log(`Found ${pendingOrders.length} pending order(s), marking as paid`);
      
      for (const order of pendingOrders) {
        order.paymentStatus = 'paid';
        order.paymentDetails = {
          ...order.paymentDetails,
          paidAt: new Date(),
        };
        // Align with ITN handler: move to processing and create wallet txn if missing
        order.status = 'processing';
        order.confirmedAt = new Date();
        order.statusHistory.push({
          status: 'processing',
          timestamp: new Date(),
          note: 'Payment confirmed via return URL',
        });

        // Ensure seller wallet has the pending sale transaction
        const wallet = await getOrCreateWallet(order.seller);
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
              source: 'payment-verify-fallback',
            },
          });
        }

        await order.save();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderNumbers: orders.map(o => o.orderNumber).join(', '),
        amount: totalAmount.toFixed(2),
        orders: orders.map(o => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          total: o.total,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Verification failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}