// utils/cartHelpers.js
import Cart from '@/models/Cart';

/**
 * Remove purchased items from a buyer's cart AFTER their payment is confirmed.
 *
 * The cart is intentionally NOT cleared at checkout time. An order is created
 * with paymentStatus 'pending' and the buyer is redirected to PayFast; if they
 * abandon checkout or the payment fails, the cart must stay intact so they can
 * retry. This helper is therefore called only once a payment is confirmed
 * 'paid' — from the PayFast ITN handler and the return-URL verify fallback.
 *
 * Only the specific products that were purchased are removed, so anything the
 * buyer added to their cart while paying is preserved. It is idempotent, so
 * repeated ITN / verify calls (or both firing) are safe.
 *
 * @param {string|import('mongoose').Types.ObjectId} buyerId
 * @param {Array<string|import('mongoose').Types.ObjectId>} productIds
 */
export async function clearPurchasedItemsFromCart(buyerId, productIds) {
  if (!buyerId || !Array.isArray(productIds) || productIds.length === 0) {
    return;
  }

  const ids = productIds
    .map(id => (id?.toString ? id.toString() : id))
    .filter(Boolean);

  if (ids.length === 0) return;

  try {
    await Cart.findOneAndUpdate(
      { user: buyerId },
      { $pull: { items: { product: { $in: ids } } } }
    );
  } catch (error) {
    // Never let cart cleanup break payment confirmation — the payment is what matters.
    console.error('Failed to clear purchased items from cart:', error.message);
  }
}
