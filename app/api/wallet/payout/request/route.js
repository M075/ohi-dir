// ============================================================================
// FILE 6: app/api/wallet/payout/request/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import PayoutRequest from '@/models/PayoutRequest';
import { getSessionUser } from '@/utils/getSessionUser';
import { sendPayoutRequestedEmails } from '@/utils/email';

// Velocity limits per seller (can be moved to env / admin settings later)
const MAX_PENDING_PAYOUTS = 3;
const MAX_DAILY_PAYOUT_AMOUNT = 50000; // ZAR

// POST - Request payout
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

    const body = await request.json();
    const { amount, notes, idempotencyKey } = body;

    const wallet = await Wallet.findOne({ seller: sessionUser.userId });

    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Wallet must not be frozen
    if (!wallet.isActive) {
      return new Response(
        JSON.stringify({
          error: `Wallet is frozen: ${wallet.holdReason || 'Account suspended'}`,
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Idempotency: if the same key was already used, return the existing request
    if (idempotencyKey) {
      const existing = await PayoutRequest.findOne({ idempotencyKey }).lean();
      if (existing) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payout request already exists',
            payoutRequest: {
              _id: existing._id,
              referenceNumber: existing.referenceNumber,
              amount: existing.amount,
              status: existing.status,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate bank details
    if (!wallet.bankDetails?.accountNumber) {
      return new Response(
        JSON.stringify({ error: 'Please add bank details before requesting payout' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const requestAmount = amount || (wallet.availableBalance - wallet.reservedBalance);
    const availableForPayout = wallet.availableBalance - wallet.reservedBalance;

    if (requestAmount < wallet.payoutSettings.minimumPayout) {
      return new Response(
        JSON.stringify({
          error: `Minimum payout amount is R ${wallet.payoutSettings.minimumPayout}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (requestAmount > availableForPayout) {
      return new Response(
        JSON.stringify({ error: 'Insufficient available balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Velocity limits
    const pendingCount = await PayoutRequest.countDocuments({
      seller: sessionUser.userId,
      status: { $in: ['pending', 'approved'] },
    });

    if (pendingCount >= MAX_PENDING_PAYOUTS) {
      return new Response(
        JSON.stringify({
          error: `Maximum ${MAX_PENDING_PAYOUTS} pending payout requests allowed`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dailyTotal = await PayoutRequest.aggregate([
      {
        $match: {
          seller: sessionUser.userId,
          status: { $ne: 'cancelled' },
          requestedAt: { $gte: startOfDay },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const dailyUsed = dailyTotal[0]?.total || 0;
    if (dailyUsed + requestAmount > MAX_DAILY_PAYOUT_AMOUNT) {
      return new Response(
        JSON.stringify({
          error: `Daily payout limit of R ${MAX_DAILY_PAYOUT_AMOUNT.toFixed(2)} would be exceeded`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reserve the balance: move from available to reserved
    wallet.availableBalance -= requestAmount;
    wallet.reservedBalance += requestAmount;
    await wallet.save();

    // Create payout request
    const payoutRequest = await PayoutRequest.create({
      seller: sessionUser.userId,
      amount: requestAmount,
      status: 'pending',
      idempotencyKey,
      bankDetailsSnapshot: {
        accountHolder: wallet.bankDetails.accountHolder,
        bankName: wallet.bankDetails.bankName,
        accountNumberMasked: wallet.bankDetails.accountNumber
          ? `•••• ${String(wallet.bankDetails.accountNumber).slice(-4)}`
          : '',
        branchCode: wallet.bankDetails.branchCode,
        accountType: wallet.bankDetails.accountType,
      },
      notes,
    });

    // Receipt for the seller, plus an alert to the admin mailbox.
    await sendPayoutRequestedEmails({
      payout: {
        referenceNumber: payoutRequest.referenceNumber,
        amount: payoutRequest.amount,
        status: payoutRequest.status,
        _id: payoutRequest._id,
      },
      seller: sessionUser.userId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout request submitted successfully',
        payoutRequest: {
          _id: payoutRequest._id,
          referenceNumber: payoutRequest.referenceNumber,
          amount: payoutRequest.amount,
          status: payoutRequest.status,
          reservedBalance: wallet.reservedBalance,
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payout request error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
