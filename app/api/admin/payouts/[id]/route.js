// ============================================================================
// FILE 5: app/api/admin/payouts/[id]/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch single payout details
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

    const payout = await Payout.findById(id)
      .populate('seller', 'storename email phone image address city province')
      .populate('processedBy', 'storename email');

    if (!payout) {
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ payout }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payout details error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
