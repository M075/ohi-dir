// ============================================================================
// FILE 5: app/api/admin/payouts/[id]/route.js
// ============================================================================
import connectDB from '@/config/database';
import PayoutRequest from '@/models/PayoutRequest';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch single payout request details
export async function GET(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Check admin access
    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    const payoutRequest = await PayoutRequest.findById(id)
      .populate('seller', 'storename email phone image address city province')
      .populate('processedBy', 'storename email');

    if (!payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'Payout request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ payout: payoutRequest }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payout request details error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
