// app/api/payment/payfast/notify/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { 
  verifyPayFastPayment, 
  isValidPayFastIP, 
  parsePayFastStatus,
  isPayFastSignatureRequired,
  isPayFastITNEnabled
} from '@/utils/payfast';
import { getOrCreateWallet, calculatePlatformFee } from '@/utils/walletHelper';

/**
 * PayFast Instant Transaction Notification (ITN) handler
 * This endpoint is called by PayFast to notify about payment status
 */
export async function POST(request) {
  try {
    if (!isPayFastITNEnabled()) {
      console.log('PayFast ITN disabled via config; acknowledging ping without processing.');
      return new Response('ITN disabled', { status: 200 });
    }

    await connectDB();

    // Get client IP for security check
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // Verify IP is from PayFast (in production)
    if (process.env.NODE_ENV === 'production' && !isValidPayFastIP(clientIP)) {
      console.error('Invalid PayFast IP:', clientIP);
      return new Response('Invalid IP', { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const postData = {};
    for (const [key, value] of formData.entries()) {
      postData[key] = value;
    }

    console.log('PayFast ITN received:', postData);

    // Verify signature if required / present
    const signatureRequired = isPayFastSignatureRequired();
    const hasSignature = typeof postData.signature === 'string' && postData.signature.length > 0;
    if (signatureRequired && !hasSignature) {
      console.error('PayFast signature missing but required.');
      return new Response('Signature missing', { status: 400 });
    }

    if (hasSignature) {
      const merchantId = postData.merchant_id;
      const passPhrase = merchantId === '10000100'
        ? (process.env.PAYFAST_SANDBOX_PASSPHRASE ?? process.env.PAYFAST_PASSPHRASE ?? null)
        : (process.env.PAYFAST_PASSPHRASE ?? null);
      const isValid = verifyPayFastPayment(postData, passPhrase);

      if (!isValid) {
        console.error('Invalid PayFast signature');
        return new Response('Invalid signature', { status: 400 });
      }
    } else {
      console.log('PayFast signature not provided; skipping verification because requirement disabled.');
    }

    // Extract data
    const {
      m_payment_id, // order number(s), may be comma-separated when multiple orders combined
      pf_payment_id,
      payment_status,
      amount_gross,
      custom_str1, // order IDs string from createPayFastPayment
    } = postData;

    // Normalise identifiers to support combined orders (comma/space separated)
    const paymentIds = (m_payment_id || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    const orderIdsFromCustom = (custom_str1 || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    // Fetch matching orders by orderNumber or _id
    const orders = await Order.find({
      $or: [
        paymentIds.length ? { orderNumber: { $in: paymentIds } } : null,
        orderIdsFromCustom.length ? { _id: { $in: orderIdsFromCustom } } : null,
      ].filter(Boolean),
    });

    if (!orders.length) {
      console.error('Order(s) not found for PayFast ITN', { m_payment_id, custom_str1 });
      return new Response('Order not found', { status: 404 });
    }

    // Verify aggregated amount across all matched orders
    const expectedAmount = parseFloat(
      orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)
    );
    const receivedAmount = parseFloat(amount_gross);

    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      console.error('Amount mismatch:', { expected: expectedAmount, received: receivedAmount, m_payment_id });
      return new Response('Amount mismatch', { status: 400 });
    }

    // Update each order and wallet
    const newPaymentStatus = parsePayFastStatus(payment_status);

    for (const order of orders) {
      order.paymentStatus = newPaymentStatus;
      order.paymentDetails = {
        ...order.paymentDetails,
        payfastPaymentId: m_payment_id,
        payfastTransactionId: pf_payment_id,
        paidAt: newPaymentStatus === 'paid' ? new Date() : null,
      };

      if (newPaymentStatus === 'paid') {
        order.status = 'processing';
        order.statusHistory.push({
          status: 'processing',
          timestamp: new Date(),
          note: 'Payment received',
        });

        // Create a pending wallet transaction for the seller (idempotent per order)
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
              payfastPaymentId: m_payment_id,
              payfastTransactionId: pf_payment_id,
            },
          });
        }
      } else if (newPaymentStatus === 'failed') {
        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Payment failed',
        });
      }

      await order.save();
      console.log('Order updated:', order.orderNumber, 'Status:', newPaymentStatus);
    }

    // Respond with success
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('PayFast ITN error:', error);
    return new Response('Server error', { status: 500 });
  }
}