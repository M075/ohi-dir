// ============================================================================
// FILE 5: app/api/wallet/bank-details/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';

// PUT - Update bank details
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

    const body = await request.json();
    const { accountHolder, bankName, accountNumber, branchCode, accountType } = body;

    // Validate required fields
    if (!accountHolder || !bankName || !accountNumber || !branchCode || !accountType) {
      return new Response(
        JSON.stringify({ error: 'All bank details are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ seller: sessionUser.userId });
    
    if (!wallet) {
      wallet = await Wallet.create({
        seller: sessionUser.userId,
      });
    }

    wallet.bankDetails = {
      accountHolder,
      bankName,
      accountNumber: accountNumber.replace(/\s/g, ''), // Remove spaces
      branchCode: branchCode.replace(/\s/g, ''),
      accountType,
      verified: false, // Admin needs to verify
    };

    await wallet.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bank details updated successfully',
        bankDetails: wallet.bankDetails,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Bank details update error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

