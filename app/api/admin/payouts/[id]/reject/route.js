// ============================================================================
// FILE 3: app/api/admin/payouts/[id]/reject/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// POST - Reject payout
export async function POST(request, { params }) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Check admin access
    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin || !admin?.adminPermissions?.includes('manage_sellers')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return new Response(
        JSON.stringify({ error: 'Rejection reason is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payout = await Payout.findById(id).populate('seller', 'storename email');

    if (!payout) {
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (payout.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Cannot reject payout with status: ${payout.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update payout status
    payout.status = 'failed';
    payout.failedAt = new Date();
    payout.failureReason = reason;
    payout.processedBy = admin._id;

    await payout.save();

    // Update wallet - return funds to available balance
    const wallet = await Wallet.findOne({ seller: payout.seller._id });
    if (wallet) {
      // Find and update the payout transaction
      const transaction = wallet.transactions.find(
        t => t.type === 'payout' && t.metadata?.get('payoutReference') === payout.referenceNumber
      );

      if (transaction) {
        transaction.status = 'failed';
        
        // Return amount to available balance
        wallet.availableBalance += Math.abs(transaction.amount);
        
        await wallet.save();
      }
    }

    // TODO: Send email notification to seller
    // await sendPayoutRejectedEmail(payout.seller.email, payout, reason);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout rejected',
        payout: {
          _id: payout._id,
          referenceNumber: payout.referenceNumber,
          status: payout.status,
          failureReason: payout.failureReason,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Reject payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
