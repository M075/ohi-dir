// ============================================================================
// FILE 3: app/api/admin/payouts/[id]/reject/route.js
// ============================================================================
import connectDB from '@/config/database';
import PayoutRequest from '@/models/PayoutRequest';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { sendPayoutRejectedEmail } from '@/utils/email';

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

    const payoutRequest = await PayoutRequest.findById(id).populate('seller', 'storename email');

    if (!payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'Payout request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (payoutRequest.status !== 'pending' && payoutRequest.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: `Cannot reject payout with status: ${payoutRequest.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update payout request status
    payoutRequest.status = 'failed';
    payoutRequest.failedAt = new Date();
    payoutRequest.failureReason = reason;
    payoutRequest.processedBy = admin._id;

    await payoutRequest.save();

    // Release reserved balance back to available balance
    const wallet = await Wallet.findOne({ seller: payoutRequest.seller._id });
    if (wallet) {
      wallet.reservedBalance = Math.max(0, wallet.reservedBalance - payoutRequest.amount);
      wallet.availableBalance += payoutRequest.amount;

      // Mark the matching payout transaction as failed
      const transaction = wallet.transactions.find(
        t => t.type === 'payout' && t.metadata?.payoutReference === payoutRequest.referenceNumber
      );

      if (transaction) {
        transaction.status = 'failed';
      }

      await wallet.save();
    }

    await sendPayoutRejectedEmail({ payout: payoutRequest, seller: payoutRequest.seller, reason });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout rejected',
        payout: {
          _id: payoutRequest._id,
          referenceNumber: payoutRequest.referenceNumber,
          status: payoutRequest.status,
          failureReason: payoutRequest.failureReason,
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
