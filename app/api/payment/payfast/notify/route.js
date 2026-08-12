// app/api/payment/payfast/notify/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import Product from '@/models/Product';
import {
  verifyPayFastPayment,
  isValidPayFastIP,
  parsePayFastStatus,
  isPayFastSignatureRequired,
  isPayFastITNEnabled,
  isPayFastSandbox,
  getPayFastPassphrase,
  validatePayFastITN,
} from '@/utils/payfast';
import { getOrCreateWallet, calculatePlatformFee, getCommissionPercentage, recordLedgerEntries } from '@/utils/walletHelper';
import { createShiplogicShipmentFromOrder } from '@/utils/courierServices';
import { clearPurchasedItemsFromCart } from '@/utils/cartHelpers';

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

    // Parse form data, preserving the order fields arrived in — PayFast's
    // validate endpoint needs the payload echoed back byte for byte.
    const formData = await request.formData();
    const rawPairs = [];
    const postData = {};
    for (const [key, value] of formData.entries()) {
      rawPairs.push([key, value]);
      postData[key] = value;
    }

    // Log identifiers only. The full payload carries the buyer's name, email
    // and cell number, and ends up in the Vercel log stream.
    console.log('PayFast ITN received:', {
      m_payment_id: postData.m_payment_id,
      pf_payment_id: postData.pf_payment_id,
      payment_status: postData.payment_status,
      clientIP,
    });

    // --- Security check 1: signature -----------------------------------
    const signatureRequired = isPayFastSignatureRequired();
    const hasSignature = typeof postData.signature === 'string' && postData.signature.length > 0;
    if (signatureRequired && !hasSignature) {
      console.error('PayFast signature missing but required.');
      return new Response('Signature missing', { status: 400 });
    }

    if (hasSignature) {
      const useSandbox = postData.merchant_id === '10000100' || isPayFastSandbox();
      const isValid = verifyPayFastPayment(postData, getPayFastPassphrase(useSandbox));

      if (!isValid) {
        console.error('Invalid PayFast signature');
        return new Response('Invalid signature', { status: 400 });
      }
    } else {
      console.log('PayFast signature not provided; skipping verification because requirement disabled.');
    }

    // --- Security check 2: source IP -----------------------------------
    // Advisory only. PayFast rotate their ranges and the header is spoofable
    // behind some proxies, so a mismatch is logged rather than fatal — the
    // validate POST-back below is what actually gates processing.
    if (!isValidPayFastIP(clientIP)) {
      console.warn('PayFast ITN from unrecognised IP:', clientIP);
    }

    // --- Security check 3: confirm with PayFast's servers ---------------
    // The one check an attacker cannot forge. Without it, anyone who learns
    // the passphrase (or who replays a captured notification) can mark orders
    // paid.
    const confirmedByPayFast = await validatePayFastITN(rawPairs);
    if (!confirmedByPayFast) {
      console.error('PayFast did not confirm this ITN as valid; refusing to process.', {
        m_payment_id: postData.m_payment_id,
        pf_payment_id: postData.pf_payment_id,
      });
      return new Response('Validation failed', { status: 400 });
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

    // Collect purchased products per buyer so we can clear their cart only once
    // payment is confirmed 'paid'.
    const purchasedByBuyer = new Map();

    for (const order of orders) {
      // --- Replay protection ------------------------------------------
      // PayFast retries notifications, and a captured notification can be
      // resubmitted by anyone who saw it. Claim each pf_payment_id once per
      // order so repeat deliveries become no-ops.
      const itnId = pf_payment_id ? String(pf_payment_id) : null;
      const alreadyProcessed = itnId
        && Array.isArray(order.paymentDetails?.processedItnIds)
        && order.paymentDetails.processedItnIds.includes(itnId);

      if (alreadyProcessed) {
        console.log(`ITN ${itnId} already applied to ${order.orderNumber}; skipping.`);
        continue;
      }

      // Never transition backwards out of paid. A late or replayed
      // FAILED/CANCELLED notification must not cancel an order that PayFast
      // already settled, or the stock-restore below would hand back inventory
      // for goods that were actually sold.
      if (order.paymentStatus === 'paid' && newPaymentStatus !== 'paid') {
        console.warn(
          `Refusing to move paid order ${order.orderNumber} to '${newPaymentStatus}' via ITN. Needs manual review.`
        );
        continue;
      }

      order.paymentStatus = newPaymentStatus;
      order.paymentDetails = {
        ...order.paymentDetails,
        payfastPaymentId: m_payment_id,
        payfastTransactionId: pf_payment_id,
        paidAt: newPaymentStatus === 'paid' ? new Date() : null,
        processedItnIds: [
          ...(order.paymentDetails?.processedItnIds || []),
          ...(itnId ? [itnId] : []),
        ],
      };

      if (newPaymentStatus === 'paid') {
        order.status = 'processing';
        order.statusHistory.push({
          status: 'processing',
          timestamp: new Date(),
          note: 'Payment received',
        });

        // Remember which products to remove from this buyer's cart (cleared
        // below, only after payment is confirmed).
        const buyerKey = order.buyer?.toString();
        if (buyerKey) {
          const productIds = purchasedByBuyer.get(buyerKey) || new Set();
          for (const item of order.items) {
            const productId = item.product?.toString();
            if (productId) productIds.add(productId);
          }
          purchasedByBuyer.set(buyerKey, productIds);
        }

        // Create a pending wallet transaction for the seller (idempotent per order)
        const wallet = await getOrCreateWallet(order.seller);
        const existingSaleTx = wallet.transactions.find(
          t => t.order?.toString() === order._id.toString() && t.type === 'sale'
        );

        if (!existingSaleTx) {
          const commissionPct = await getCommissionPercentage();
          const platformFee = calculatePlatformFee(order.subtotal, commissionPct);

          // The seller is paid on their goods only: net = subtotal - commission.
          // Shipping (allocated to admin) and tax are recorded in the ledger,
          // not deducted from the seller here.
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
              commissionPercentage: commissionPct,
              commissionAmount: platformFee,
              shippingToAdmin: order.shipping || 0,
            },
          });

          // Record ledger entries for the full split (commission / seller /
          // shipping-to-admin / tax).
          await recordLedgerEntries(order, commissionPct);
        }
      } else if (newPaymentStatus === 'failed') {
        order.status = 'cancelled';
        order.statusHistory.push({
          status: 'cancelled',
          timestamp: new Date(),
          note: 'Payment failed',
        });

        // Payment failed, so release the stock that was reserved at checkout.
        // Guarded so repeated ITN callbacks don't restore stock more than once.
        if (!order.stockRestored) {
          for (const item of order.items) {
            await Product.findByIdAndUpdate(
              item.product,
              { $inc: { stock: item.quantity } }
            );
          }
          order.stockRestored = true;
        }
      }

      await order.save();

      // Create shipment on Shiplogic for door-to-door deliveries after payment is confirmed
      if (newPaymentStatus === 'paid' && order.fulfillmentOption === 'door-to-door' && !order.courierReference) {
        try {
          console.log(`📦 Creating shipment on Shiplogic for order: ${order.orderNumber}`);
          
          const shipmentResult = await createShiplogicShipmentFromOrder(order);
          
          if (shipmentResult && shipmentResult.shipmentId) {
            order.courierProvider = 'courier-guy';
            order.courierReference = shipmentResult.shipmentId;
            order.trackingNumber = shipmentResult.trackingReference;
            order.status = 'shipped'; // Mark as shipped once shipment is created
            order.shippedAt = new Date();
            order.statusHistory.push({
              status: 'shipped',
              timestamp: new Date(),
              note: `Shipment created on Shiplogic - Reference: ${shipmentResult.shipmentId}`,
            });
            
            console.log(`✅ Shipment created successfully for ${order.orderNumber}:`, {
              shipmentId: shipmentResult.shipmentId,
              trackingNumber: shipmentResult.trackingReference,
              labelUrl: shipmentResult.labelUrl,
            });

            await order.save();
          }
        } catch (shipmentError) {
          console.error(`⚠️ Failed to create shipment for order ${order.orderNumber}:`, shipmentError.message);
          // Don't fail payment processing if shipment creation fails
          // The order has been marked as paid and processing, which is the important part
          // Shipment can be retried manually or via a background job
        }
      } else if (newPaymentStatus === 'paid' && (order.fulfillmentOption === 'collection' || order.fulfillmentOption === 'pudo')) {
        console.log(`ℹ️ Order ${order.orderNumber} uses ${order.fulfillmentOption} fulfillment - skipping Shiplogic shipment creation`);
      }

      console.log('Order updated:', order.orderNumber, 'Status:', newPaymentStatus);
    }

    // Now that payment is confirmed, clear the purchased items from each
    // buyer's cart. Only the purchased products are removed (anything added
    // while paying is preserved), and it is idempotent across ITN retries.
    for (const [buyerId, productIdSet] of purchasedByBuyer) {
      await clearPurchasedItemsFromCart(buyerId, [...productIdSet]);
    }

    // Respond with success
    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('PayFast ITN error:', error);
    return new Response('Server error', { status: 500 });
  }
}