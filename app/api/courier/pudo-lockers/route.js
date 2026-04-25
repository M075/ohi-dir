// app/api/courier/pudo-lockers/route.js
import { PUDOLockerService } from '@/utils/courierServices';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();

    if (!search) {
      return new Response(
        JSON.stringify({ error: 'Missing search parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passthroughKeys = [
      'lat',
      'lng',
      'min_lat',
      'max_lat',
      'min_lng',
      'max_lng',
      'order_closest',
      'type',
      'types',
    ];

    const extraParams = {};
    for (const key of passthroughKeys) {
      const value = searchParams.get(key);
      if (value) {
        extraParams[key] = value;
      }
    }

    const pudoService = new PUDOLockerService();
    const lockers = await pudoService.findNearbyLockers(search, extraParams);

    return new Response(
      JSON.stringify({ lockers }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('PUDO locker search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}