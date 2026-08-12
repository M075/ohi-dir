import connectDB from '@/config/database';
import Cart from '@/models/Cart';
import { getSessionUser } from '@/utils/getSessionUser';
import { validateShippingAddress } from '@/utils/shipping';
import { quoteCartShipping, normalizeRequestAddress } from '@/utils/checkoutQuotes';

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

    const { quotesBySeller, estimatedShipping } = await quoteCartShipping(cart, normalizedAddress);

    if (!Object.keys(quotesBySeller).length) {
      return jsonResponse({ error: 'Unable to determine seller addresses for cart items' }, 400);
    }

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
