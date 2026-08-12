// utils/checkoutQuotes.js
//
// Shared courier quoting for checkout.
//
// Both the quote preview (/api/checkout/quotes) and order creation
// (/api/checkout) run through this, so the price a buyer is shown and the
// price they are charged are produced by the same code against the same
// inputs. Previously order creation trusted a price posted by the browser,
// which meant a buyer could set their own shipping cost to zero while we still
// paid the courier.

import { CourierServiceManager } from '@/utils/courierServices';
import { buildSellerSnapshot, buildParcelsForItem, summarizeParcels } from '@/utils/orderShippingHelpers';

export const normalizeRequestAddress = (address = {}) => ({
  fullName: address.fullName?.trim() || '',
  email: address.email?.trim() || '',
  phone: address.phone?.trim() || '',
  company: address.company?.trim() || '',
  address: address.address?.trim() || '',
  apartment: address.apartment?.trim() || '',
  city: address.city?.trim() || '',
  province: address.province?.trim() || address.region?.trim() || '',
  postalCode: address.postalCode?.trim() || address.zipCode?.trim() || '',
});

/**
 * Group cart items by seller, with the parcels and declared value each
 * seller's shipment would carry.
 */
export function groupCartBySeller(cart) {
  const sellers = {};

  for (const item of cart.items) {
    if (!item.product?.owner?._id) continue;
    const sellerId = item.product.owner._id.toString();

    if (!sellers[sellerId]) {
      sellers[sellerId] = {
        sellerId,
        sellerName: item.product.owner.storename || item.product.ownerName || 'Seller',
        sellerAddress: buildSellerSnapshot(item.product.owner),
        parcels: [],
        declaredValue: 0,
      };
    }

    sellers[sellerId].parcels.push(...buildParcelsForItem(item));
    sellers[sellerId].declaredValue += item.price * item.quantity;
  }

  return sellers;
}

/**
 * Fetch live courier quotes for every seller in the cart.
 *
 * Returns { quotesBySeller, estimatedShipping }. A seller whose quotes fail
 * comes back with an empty list and an `error`, rather than throwing — one
 * courier outage shouldn't take down the whole checkout.
 */
export async function quoteCartShipping(cart, normalizedAddress) {
  const sellers = groupCartBySeller(cart);

  if (!Object.keys(sellers).length) {
    return { quotesBySeller: {}, estimatedShipping: 0 };
  }

  const buyerAddress = {
    type: 'residential',
    name: normalizedAddress.fullName,
    company: normalizedAddress.company,
    address: normalizedAddress.address,
    suburb: normalizedAddress.apartment,
    city: normalizedAddress.city,
    province: normalizedAddress.province,
    postalCode: normalizedAddress.postalCode,
    email: normalizedAddress.email,
    phone: normalizedAddress.phone,
  };

  const courierManager = new CourierServiceManager();
  const quotesBySeller = {};
  let estimatedShipping = 0;

  await Promise.all(Object.values(sellers).map(async (sellerInfo) => {
    const parcelSummary = summarizeParcels(sellerInfo.parcels);

    try {
      const quotes = await courierManager.getAllQuotes({
        from: sellerInfo.sellerAddress,
        to: buyerAddress,
        parcels: parcelSummary.parcels,
        declaredValue: sellerInfo.declaredValue,
      });

      const bestQuote = pickCheapest(quotes);
      if (bestQuote?.price) {
        estimatedShipping += Number(bestQuote.price) || 0;
      }

      quotesBySeller[sellerInfo.sellerId] = {
        sellerId: sellerInfo.sellerId,
        sellerName: sellerInfo.sellerName,
        quotes,
        bestQuote,
      };
    } catch (error) {
      console.warn('Failed to fetch courier quotes for seller', sellerInfo.sellerId, error.message);
      quotesBySeller[sellerInfo.sellerId] = {
        sellerId: sellerInfo.sellerId,
        sellerName: sellerInfo.sellerName,
        quotes: [],
        bestQuote: null,
        error: error.message,
      };
    }
  }));

  return { quotesBySeller, estimatedShipping };
}

function pickCheapest(quotes) {
  if (!Array.isArray(quotes) || !quotes.length) return null;
  return quotes.reduce((best, quote) => {
    if (!best || (quote.price ?? Infinity) < (best.price ?? Infinity)) return quote;
    return best;
  }, null);
}

/**
 * Resolve which server-side quote the buyer picked.
 *
 * The browser tells us *which service* was chosen (provider + service level);
 * it never tells us the price. We look that selection up in the quotes we just
 * fetched ourselves and return the authoritative one. An unrecognised or
 * missing selection falls back to the cheapest available service, so a
 * tampered request gets a real price rather than a free ride.
 */
export function resolveSelectedQuote(sellerQuotes, clientSelection) {
  if (!sellerQuotes) return null;

  const available = Array.isArray(sellerQuotes.quotes) ? sellerQuotes.quotes : [];
  if (!available.length) return null;

  const wantedCode = clientSelection?.service_level_code ?? clientSelection?.serviceCode;
  const wantedProvider = clientSelection?.provider;

  if (wantedCode) {
    const match = available.find(q =>
      q.service_level_code === wantedCode &&
      (!wantedProvider || q.provider === wantedProvider)
    );
    if (match) return match;

    console.warn(
      `Checkout selection '${wantedProvider || 'any'}/${wantedCode}' is not in the live quotes; using cheapest instead.`
    );
  }

  return sellerQuotes.bestQuote || pickCheapest(available);
}
