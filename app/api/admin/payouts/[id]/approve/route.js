// ============================================================================
// FILE 2: app/api/admin/payouts/[id]/approve/route.js
// ============================================================================
import connectDB from '@/config/database';
import PayoutRequest from '@/models/PayoutRequest';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { sendPayoutApprovedEmail } from '@/utils/email';

// POST - Approve payout
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
    const { externalReference, notes } = body;

    const payoutRequest = await PayoutRequest.findById(id).populate('seller', 'storename email');

    if (!payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'Payout request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (payoutRequest.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Cannot approve payout with status: ${payoutRequest.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update payout request status
    payoutRequest.status = 'approved';
    payoutRequest.processedAt = new Date();
    payoutRequest.processedBy = admin._id;
    if (externalReference) {
      payoutRequest.externalReference = externalReference;
    }
    if (notes) {
      payoutRequest.notes = notes;
    }

    await payoutRequest.save();

    // Update wallet - mark the matching payout transaction as processing
    const wallet = await Wallet.findOne({ seller: payoutRequest.seller._id });
    if (wallet) {
      const transaction = wallet.transactions.find(
        t => t.type === 'payout' && t.metadata?.payoutReference === payoutRequest.referenceNumber
      );

      if (transaction) {
        transaction.status = 'processing';
        await wallet.save();
      }
    }

    await sendPayoutApprovedEmail({ payout: payoutRequest, seller: payoutRequest.seller });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout approved and processing',
        payout: {
          _id: payoutRequest._id,
          referenceNumber: payoutRequest.referenceNumber,
          status: payoutRequest.status,
          processedAt: payoutRequest.processedAt,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Approve payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
