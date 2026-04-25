// app/api/courier/book/route.js
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
    const { orderId, provider, service, deliveryAddress, collectionAddress } = body;

    if (!provider || !service) {
      return new Response(
        JSON.stringify({ error: 'Missing courier provider or service selection' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const order = await Order.findById(orderId)
      .populate('seller', 'storename email phone address city province zipCode country');
    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is seller
    if (order.seller.toString() !== sessionUser.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Only seller can book courier' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sellerSnapshot = order.sellerAddressSnapshot || order.seller;
    const buyerSnapshot = order.shippingAddress;

    const normalizedCollectionAddress = normalizeAddress(
      collectionAddress || sellerSnapshot,
      {
        type: 'business',
        company: order.sellerName || order.seller?.storename,
        name: collectionAddress?.name || sellerSnapshot?.name || order.sellerName,
        email: collectionAddress?.email || sellerSnapshot?.email || order.seller?.email,
        phone: collectionAddress?.phone || sellerSnapshot?.phone || order.seller?.phone,
      }
    );

    const normalizedDeliveryAddress = normalizeAddress(
      deliveryAddress || buyerSnapshot,
      {
        type: 'residential',
        name: deliveryAddress?.name || buyerSnapshot?.fullName,
        email: deliveryAddress?.email || buyerSnapshot?.email || order.buyerEmail,
        phone: deliveryAddress?.phone || buyerSnapshot?.phone,
      }
    );

    if (!normalizedCollectionAddress.address || !normalizedCollectionAddress.city || !normalizedCollectionAddress.postalCode) {
      return new Response(
        JSON.stringify({ error: 'Seller collection address is incomplete.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!normalizedDeliveryAddress.address || !normalizedDeliveryAddress.city || !normalizedDeliveryAddress.postalCode) {
      return new Response(
        JSON.stringify({ error: 'Buyer delivery address is incomplete.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const collectionContact = {
      name: normalizedCollectionAddress.name || normalizedCollectionAddress.company || order.sellerName,
      email: normalizedCollectionAddress.email,
      phone: normalizedCollectionAddress.phone,
    };

    const deliveryContact = {
      name: normalizedDeliveryAddress.name || buyerSnapshot?.fullName,
      email: normalizedDeliveryAddress.email,
      phone: normalizedDeliveryAddress.phone,
    };

    if (!collectionContact.email && !collectionContact.phone) {
      return new Response(
        JSON.stringify({ error: 'Seller contact requires at least an email or phone number.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!deliveryContact.email && !deliveryContact.phone) {
      return new Response(
        JSON.stringify({ error: 'Buyer contact requires at least an email or phone number.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const fallbackDescription = `Order ${order.orderNumber}`;
    const parcels = body.parcels?.length
      ? normalizeParcels(body.parcels, fallbackDescription)
      : buildParcelsFromOrder(order, fallbackDescription);

    const courierManager = new CourierServiceManager();

    const shipmentData = {
      orderNumber: order.orderNumber,
      collectionAddress: normalizedCollectionAddress,
      collectionContact,
      deliveryAddress: normalizedDeliveryAddress,
      deliveryContact,
      parcels,
      declaredValue: order.total,
      collectionNotes: body.collectionNotes,
      deliveryNotes: body.deliveryNotes,
    };

    const shipment = await courierManager.createShipment(
      provider,
      shipmentData,
      service
    );

    // Update order with courier info
    order.courierProvider = provider;
    order.trackingNumber = shipment.tracking_number || shipment.label_id;
    order.courierReference = shipment.reference;
    order.status = 'shipped';
    order.shippedAt = new Date();
    order.statusHistory.push({
      status: 'shipped',
      timestamp: new Date(),
      note: `Shipped via ${provider}`,
    });

    await order.save();

    return new Response(
      JSON.stringify({ 
        success: true,
        order,
        shipment 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Courier booking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

