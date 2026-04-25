// FILE 7: app/api/wallet/payout/history/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch payout history
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const status = searchParams.get('status');

    let query = { seller: sessionUser.userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const payouts = await Payout.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-processedBy');

    const total = await Payout.countDocuments(query);

    return new Response(
      JSON.stringify({
        payouts,
        total,
        limit,
        skip,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payout history error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

