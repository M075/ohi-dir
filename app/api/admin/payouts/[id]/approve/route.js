// ============================================================================
// FILE 2: app/api/admin/payouts/[id]/approve/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

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

    const payout = await Payout.findById(id).populate('seller', 'storename email');

    if (!payout) {
      return new Response(
        JSON.stringify({ error: 'Payout not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (payout.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Cannot approve payout with status: ${payout.status}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update payout status
    payout.status = 'processing';
    payout.processedAt = new Date();
    payout.processedBy = admin._id;
    if (externalReference) {
      payout.externalReference = externalReference;
    }
    if (notes) {
      payout.notes = notes;
    }

    await payout.save();

    // Update wallet transaction
    const wallet = await Wallet.findOne({ seller: payout.seller._id });
    if (wallet) {
      const transaction = wallet.transactions.find(
        t => t.type === 'payout' && t.metadata?.get('payoutReference') === payout.referenceNumber
      );

      if (transaction) {
        transaction.status = 'processing';
        await wallet.save();
      }
    }

    // TODO: Send email notification to seller
    // await sendPayoutApprovedEmail(payout.seller.email, payout);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout approved and processing',
        payout: {
          _id: payout._id,
          referenceNumber: payout.referenceNumber,
          status: payout.status,
          processedAt: payout.processedAt,
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
