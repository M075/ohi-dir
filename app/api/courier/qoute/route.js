// app/api/courier/quote/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';
import { CourierServiceManager } from '@/utils/courierServices';
import {
  normalizeAddress,
  normalizeParcels,
  buildParcelsFromOrder,
} from '@/utils/courierHelpers';

export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { orderId } = body;

    const courierManager = new CourierServiceManager();
    let shipment;

    if (orderId) {
      const order = await Order.findById(orderId)
        .select('seller sellerAddressSnapshot shippingAddress parcelSummary items total orderNumber')
        .populate('seller', 'storename email phone address city province zipCode country');

      if (!order) {
        return new Response(
          JSON.stringify({ error: 'Order not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const isSeller = order.seller?._id?.toString?.() === sessionUser.userId;
      if (!isSeller) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Only the seller can fetch courier quotes for this order' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const sellerAddress = normalizeAddress(
        order.sellerAddressSnapshot || order.seller,
        { type: 'residential', name: order.seller?.storename }
      );
      const buyerAddress = normalizeAddress(
        order.shippingAddress,
        { type: 'residential', name: order.shippingAddress?.fullName }
      );

      if (!sellerAddress.address || !sellerAddress.city || !sellerAddress.postalCode) {
        return new Response(
          JSON.stringify({ error: 'Seller address is incomplete. Please update store address before booking a courier.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (!buyerAddress.address || !buyerAddress.city || !buyerAddress.postalCode) {
        return new Response(
          JSON.stringify({ error: 'Buyer shipping address is incomplete for courier booking.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      shipment = {
        from: sellerAddress,
        to: buyerAddress,
        parcels: buildParcelsFromOrder(order),
        declaredValue: Number(order.total) || 0,
      };
    } else {
      if (!body.collectionAddress || !body.deliveryAddress) {
        return new Response(
          JSON.stringify({ error: 'Missing collection or delivery address' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      shipment = {
        from: normalizeAddress(body.collectionAddress, { type: 'residential' }),
        to: normalizeAddress(body.deliveryAddress, { type: 'residential' }),
        parcels: normalizeParcels(body.parcels, 'Custom parcel'),
        declaredValue: Number(body.declaredValue) || 0,
      };
    }

    const quotes = await courierManager.getAllQuotes(shipment);

    return new Response(
      JSON.stringify({ quotes, shipment }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Courier quote error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch courier quotes' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

