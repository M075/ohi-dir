import connectDB from '@/config/database';
import Order from '@/models/Order';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { CourierServiceManager } from '@/utils/courierServices';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;
    const order = await Order.findById(id).populate('buyer seller');

    if (!order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authorization
    const user = await User.findById(sessionUser.userId);
    const isAdmin = user?.isAdmin;
    const isSeller = order.seller._id.toString() === sessionUser.userId;
    const isBuyer = order.buyer._id.toString() === sessionUser.userId;

    if (!isAdmin && !isSeller && !isBuyer) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!order.trackingNumber || !order.courierProvider) {
      return new Response(
        JSON.stringify({ error: 'No tracking information available for this order' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const courierManager = new CourierServiceManager();
    // Normalize provider for shiplogic API (it uses courier-guy)
    const provider = order.courierProvider === 'shiplogic' ? 'courier-guy' : order.courierProvider;
    
    let trackingData;
    try {
      trackingData = await courierManager.trackShipment(provider, order.trackingNumber);
    } catch (err) {
      console.error('Failed to fetch tracking from CourierManager:', err);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve tracking data from courier' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ tracking: trackingData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Track order error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
