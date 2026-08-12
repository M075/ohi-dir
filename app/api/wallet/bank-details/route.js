// ============================================================================
// FILE 5: app/api/wallet/bank-details/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';
import { encryptField, decryptField, maskAccountNumber } from '@/utils/fieldEncryption';

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

    // The wallet endpoint only ever returns a masked account number, so a
    // resubmitted form may contain the mask rather than a real number. Treat
    // that as "unchanged" instead of overwriting the stored value with dots.
    const submittedAccount = String(accountNumber).replace(/\s/g, '');
    const accountUnchanged = submittedAccount.includes('•');

    if (!accountUnchanged && !/^\d{6,20}$/.test(submittedAccount)) {
      return new Response(
        JSON.stringify({ error: 'Account number must be 6 to 20 digits' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const storedAccountNumber = accountUnchanged
      ? wallet.bankDetails?.accountNumber
      : encryptField(submittedAccount);

    if (!storedAccountNumber) {
      return new Response(
        JSON.stringify({ error: 'Account number is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    wallet.bankDetails = {
      accountHolder,
      bankName,
      accountNumber: storedAccountNumber, // encrypted at rest
      branchCode: branchCode.replace(/\s/g, ''),
      accountType,
      verified: false, // Admin needs to verify
    };

    await wallet.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bank details updated successfully',
        bankDetails: {
          accountHolder: wallet.bankDetails.accountHolder,
          bankName: wallet.bankDetails.bankName,
          accountNumber: maskAccountNumber(decryptField(wallet.bankDetails.accountNumber)),
          branchCode: wallet.bankDetails.branchCode,
          accountType: wallet.bankDetails.accountType,
          verified: wallet.bankDetails.verified,
        },
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

