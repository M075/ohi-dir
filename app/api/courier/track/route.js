// app/api/courier/track/route.js
import connectDB from '@/config/database';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';
import { CourierServiceManager } from '@/utils/courierServices';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const trackingNumber = searchParams.get('tracking');
    const provider = searchParams.get('provider');

    if (!trackingNumber || !provider) {
      return new Response(
        JSON.stringify({ error: 'Missing tracking number or provider' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const courierManager = new CourierServiceManager();
    const trackingInfo = await courierManager.trackShipment(provider, trackingNumber);

    return new Response(
      JSON.stringify({ tracking: trackingInfo }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Courier tracking error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

