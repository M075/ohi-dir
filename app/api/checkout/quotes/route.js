import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import { getSessionUser } from '@/utils/getSessionUser';
import { validateShippingAddress } from '@/utils/shipping';
import { CourierServiceManager } from '@/utils/courierServices';
import { buildSellerSnapshot, buildParcelsForItem, summarizeParcels } from '@/utils/orderShippingHelpers';

const jsonResponse = (data, status = 200) => new Response(
  JSON.stringify(data),
  {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  },
);

const normalizeRequestAddress = (address = {}) => ({
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

export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const normalizedAddress = normalizeRequestAddress(body?.shippingAddress);

    if (!normalizedAddress.address || !normalizedAddress.city || !normalizedAddress.province || !normalizedAddress.postalCode) {
      return jsonResponse({ error: 'Shipping address is incomplete' }, 400);
    }

    const validation = validateShippingAddress({
      ...normalizedAddress,
      fullName: normalizedAddress.fullName || normalizedAddress.company || 'Customer',
    });

    if (!validation.valid) {
      return jsonResponse({ error: 'Invalid shipping address', details: validation.errors }, 400);
    }

    const cart = await Cart.findOne({ user: sessionUser.userId })
      .populate({
        path: 'items.product',
        select: 'title images price stock ownerName owner dimensions weight',
        populate: {
          path: 'owner',
          select: 'storename contactName email phone address apartment suburb city province zipCode country',
        },
      });

    if (!cart || cart.items.length === 0) {
      return jsonResponse({ error: 'Cart is empty' }, 400);
    }

    const sellers = {};

    for (const item of cart.items) {
      if (!item.product?.owner?._id) continue;
      const sellerId = item.product.owner._id.toString();
      const sellerName = item.product.owner.storename || item.product.ownerName || 'Seller';
      const sellerSnapshot = buildSellerSnapshot(item.product.owner);

      if (!sellers[sellerId]) {
        sellers[sellerId] = {
          sellerId,
          sellerName,
          sellerAddress: sellerSnapshot,
          parcels: [],
          declaredValue: 0,
        };
      }

      sellers[sellerId].parcels.push(...buildParcelsForItem(item));
      sellers[sellerId].declaredValue += item.price * item.quantity;
    }

    if (!Object.keys(sellers).length) {
      return jsonResponse({ error: 'Unable to determine seller addresses for cart items' }, 400);
    }

    const courierManager = new CourierServiceManager();
    const quotesBySeller = {};
    let estimatedShipping = 0;

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

    await Promise.all(Object.values(sellers).map(async (sellerInfo) => {
      const parcelSummary = summarizeParcels(sellerInfo.parcels);

      try {
        const quotes = await courierManager.getAllQuotes({
          from: sellerInfo.sellerAddress,
          to: buyerAddress,
          parcels: parcelSummary.parcels,
          declaredValue: sellerInfo.declaredValue,
        });

        let bestQuote = null;
        if (Array.isArray(quotes) && quotes.length) {
          bestQuote = quotes.reduce((best, quote) => {
            if (!best || (quote.price ?? Infinity) < (best.price ?? Infinity)) {
              return quote;
            }
            return best;
          }, null);

          if (bestQuote?.price) {
            estimatedShipping += Number(bestQuote.price) || 0;
          }
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

    return jsonResponse({
      quotesBySeller,
      summary: {
        sellerCount: Object.keys(quotesBySeller).length,
        estimatedShipping,
      },
    });
  } catch (error) {
    console.error('Checkout quote error:', error);
    return jsonResponse({ error: error.message || 'Failed to fetch courier quotes' }, 500);
  }
}
