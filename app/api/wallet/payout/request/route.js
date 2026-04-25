// ============================================================================
// FILE 6: app/api/wallet/payout/request/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import Payout from '@/models/Payout';
import { getSessionUser } from '@/utils/getSessionUser';

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
    const { amount, notes } = body;

    const wallet = await Wallet.findOne({ seller: sessionUser.userId });
    
    if (!wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate bank details
    if (!wallet.bankDetails?.accountNumber) {
      return new Response(
        JSON.stringify({ error: 'Please add bank details before requesting payout' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    const requestAmount = amount || wallet.availableBalance;
    
    if (requestAmount < wallet.payoutSettings.minimumPayout) {
      return new Response(
        JSON.stringify({ 
          error: `Minimum payout amount is R ${wallet.payoutSettings.minimumPayout}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (requestAmount > wallet.availableBalance) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create payout request
    const payout = await Payout.create({
      seller: sessionUser.userId,
      amount: requestAmount,
      method: 'bank_transfer',
      bankDetails: {
        accountHolder: wallet.bankDetails.accountHolder,
        bankName: wallet.bankDetails.bankName,
        accountNumber: wallet.bankDetails.accountNumber,
        branchCode: wallet.bankDetails.branchCode,
        accountType: wallet.bankDetails.accountType,
      },
      notes,
      isAutomatic: false,
    });

    // Add transaction to wallet (pending)
    await wallet.addTransaction({
      type: 'payout',
      amount: -requestAmount,
      fee: 0,
      status: 'processing',
      description: `Payout Request - ${payout.referenceNumber}`,
      payout: payout._id,
      metadata: {
        payoutReference: payout.referenceNumber,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payout request submitted successfully',
        payout: {
          _id: payout._id,
          referenceNumber: payout.referenceNumber,
          amount: payout.amount,
          status: payout.status,
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


