// ============================================================================
// FILE 4: app/api/admin/payouts/[id]/complete/route.js
// ============================================================================
import connectDB from '@/config/database';
import PayoutRequest from '@/models/PayoutRequest';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';
import { addTransactionAtomically } from '@/utils/walletHelper';
import { sendPayoutCompletedEmail } from '@/utils/email';

// POST - Mark payout as completed
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

    if (payoutRequest.status !== 'approved' && payoutRequest.status !== 'processing') {
      return new Response(
        JSON.stringify({ error: `Can only complete payouts with status 'approved' or 'processing'` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update payout request status
    payoutRequest.status = 'completed';
    payoutRequest.completedAt = new Date();

    if (externalReference) {
      payoutRequest.externalReference = externalReference;
    }
    if (notes) {
      payoutRequest.notes = payoutRequest.notes
        ? `${payoutRequest.notes}\n${notes}`
        : notes;
    }

    await payoutRequest.save();

    // Release reserved balance and deduct from available
    const wallet = await Wallet.findOne({ seller: payoutRequest.seller._id });
    if (wallet) {
      if (wallet.reservedBalance < payoutRequest.amount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient reserved balance' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      wallet.reservedBalance -= payoutRequest.amount;
      wallet.availableBalance -= payoutRequest.amount;
      wallet.totalPayouts += payoutRequest.amount;

      // Mark the matching payout transaction as completed
      const transaction = wallet.transactions.find(
        t => t.type === 'payout' && t.metadata?.payoutReference === payoutRequest.referenceNumber
      );

      if (transaction) {
        transaction.status = 'completed';
      }

      await wallet.save();

      // Record a completed payout ledger transaction (idempotent)
      await addTransactionAtomically({
        walletId: wallet._id,
        type: 'payout',
        amount: payoutRequest.amount,
        fee: 0,
        status: 'completed',
        description: `Payout completed by admin - ${payoutRequest.referenceNumber}`,
        paymentMethod: 'bank_transfer',
        metadata: {
          payoutReference: payoutRequest.referenceNumber,
          processedBy: admin._id,
          externalReference,
          completedAt: payoutRequest.completedAt,
        },
        idempotencyKey: `payout-complete-${payoutRequest._id}`,
      });
    }

    await sendPayoutCompletedEmail({
      payout: payoutRequest,
      seller: payoutRequest.seller,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout marked as completed',
        payout: {
          _id: payoutRequest._id,
          referenceNumber: payoutRequest.referenceNumber,
          status: payoutRequest.status,
          completedAt: payoutRequest.completedAt,
          externalReference: payoutRequest.externalReference,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Complete payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
