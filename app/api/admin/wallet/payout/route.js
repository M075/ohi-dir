// app/api/admin/wallet/payout/route.js - Admin payout processing API
import connectDB from '@/config/database';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import PayoutRequest from '@/models/PayoutRequest';
import { getSessionUser } from '@/utils/getSessionUser';
import { addTransactionAtomically } from '@/utils/walletHelper';
import { sendPayoutCompletedEmail } from '@/utils/email';

export async function POST(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sellerId, amount, externalReference, notes } = await request.json();

    if (!sellerId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Seller ID and amount are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wallet = await Wallet.findOne({ seller: sellerId });
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the matching pending/approved PayoutRequest for this seller + amount
    const payoutRequest = await PayoutRequest.findOne({
      seller: sellerId,
      amount,
      status: { $in: ['pending', 'approved'] },
    });

    if (!payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'No pending payout request found for this amount' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate sufficient reserved balance
    if (wallet.reservedBalance < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient reserved balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();

    // Mark the PayoutRequest as completed
    payoutRequest.status = 'completed';
    payoutRequest.processedBy = admin._id;
    payoutRequest.processedAt = now;
    payoutRequest.completedAt = now;
    if (externalReference) payoutRequest.externalReference = externalReference;
    if (notes) payoutRequest.failureReason = notes;
    await payoutRequest.save();

    // Release the reserved balance and deduct from available
    wallet.reservedBalance -= amount;
    wallet.availableBalance -= amount;
    wallet.totalPayouts += amount;

    // Record a completed payout ledger transaction
    await addTransactionAtomically({
      walletId: wallet._id,
      type: 'payout',
      amount,
      fee: 0,
      status: 'completed',
      description: `Payout completed by admin - ${payoutRequest.referenceNumber}`,
      paymentMethod: 'bank_transfer',
      metadata: {
        payoutReference: payoutRequest.referenceNumber,
        processedBy: admin._id,
        externalReference,
        processedAt: now,
      },
      idempotencyKey: `payout-complete-${payoutRequest._id}`,
    });

    await wallet.save();

    // Send completion email to seller
    const seller = await User.findById(sellerId).select('storename email');
    await sendPayoutCompletedEmail({
      payout: {
        referenceNumber: payoutRequest.referenceNumber,
        amount: payoutRequest.amount,
        status: 'completed',
        completedAt: now,
        externalReference,
      },
      seller,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payout of R ${amount.toFixed(2)} processed successfully`,
        payout: {
          sellerId,
          sellerName: seller?.storename,
          amount,
          newBalance: wallet.availableBalance,
          reservedBalance: wallet.reservedBalance,
          referenceNumber: payoutRequest.referenceNumber,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin payout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const admin = await User.findById(sessionUser.userId);
    if (!admin?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sellerId, amount, reason } = await request.json();

    if (!sellerId || !amount || !reason) {
      return new Response(
        JSON.stringify({ error: 'Seller ID, amount, and reason are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wallet = await Wallet.findOne({ seller: sellerId });
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the matching pending/approved PayoutRequest
    const payoutRequest = await PayoutRequest.findOne({
      seller: sellerId,
      amount,
      status: { $in: ['pending', 'approved'] },
    });

    if (!payoutRequest) {
      return new Response(
        JSON.stringify({ error: 'No pending payout request found for this amount' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();

    // Mark the PayoutRequest as failed
    payoutRequest.status = 'failed';
    payoutRequest.processedBy = admin._id;
    payoutRequest.processedAt = now;
    payoutRequest.failedAt = now;
    payoutRequest.failureReason = reason;
    await payoutRequest.save();

    // Release the reserved balance back to available
    wallet.reservedBalance = Math.max(0, wallet.reservedBalance - amount);
    wallet.availableBalance += amount;
    await wallet.save();

    // Record a failed payout ledger transaction
    await addTransactionAtomically({
      walletId: wallet._id,
      type: 'payout',
      amount,
      fee: 0,
      status: 'failed',
      description: `Payout failed by admin - ${payoutRequest.referenceNumber}: ${reason}`,
      paymentMethod: 'bank_transfer',
      metadata: {
        payoutReference: payoutRequest.referenceNumber,
        processedBy: admin._id,
        failureReason: reason,
        processedAt: now,
      },
      idempotencyKey: `payout-fail-${payoutRequest._id}`,
    });

    const seller = await User.findById(sellerId).select('storename email');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payout of R ${amount.toFixed(2)} rejected and funds released`,
        payout: {
          sellerId,
          sellerName: seller?.storename,
          amount,
          newBalance: wallet.availableBalance,
          reservedBalance: wallet.reservedBalance,
          referenceNumber: payoutRequest.referenceNumber,
          failureReason: reason,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin payout reject error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
