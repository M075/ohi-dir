// ============================================================================
// FILE 6: app/api/admin/payouts/bulk-process/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// POST - Bulk approve/reject payouts
export async function POST(request) {
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

    const body = await request.json();
    const { payoutIds, action, reason } = body;

    if (!payoutIds || !Array.isArray(payoutIds) || payoutIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Payout IDs array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "approve" or "reject"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'reject' && !reason) {
      return new Response(
        JSON.stringify({ error: 'Reason is required for rejection' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const payouts = await Payout.find({
      _id: { $in: payoutIds },
      status: 'pending'
    });

    if (payouts.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pending payouts found with provided IDs' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      success: [],
      failed: [],
    };

    for (const payout of payouts) {
      try {
        if (action === 'approve') {
          payout.status = 'processing';
          payout.processedAt = new Date();
          payout.processedBy = admin._id;
        } else {
          payout.status = 'failed';
          payout.failedAt = new Date();
          payout.failureReason = reason;
          payout.processedBy = admin._id;

          // Return funds to wallet
          const wallet = await Wallet.findOne({ seller: payout.seller });
          if (wallet) {
            const transaction = wallet.transactions.find(
              t => t.type === 'payout' && 
                   t.metadata?.get('payoutReference') === payout.referenceNumber
            );

            if (transaction) {
              transaction.status = 'failed';
              wallet.availableBalance += Math.abs(transaction.amount);
              await wallet.save();
            }
          }
        }

        await payout.save();
        results.success.push(payout.referenceNumber);

      } catch (err) {
        console.error(`Failed to process payout ${payout.referenceNumber}:`, err);
        results.failed.push({
          referenceNumber: payout.referenceNumber,
          error: err.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.success.length} payouts`,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bulk process error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

