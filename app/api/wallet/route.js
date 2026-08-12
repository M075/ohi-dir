// ============================================================================
// FILE 3: app/api/wallet/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';
import { decryptField, maskAccountNumber } from '@/utils/fieldEncryption';

// GET - Fetch wallet data
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    if (!sessionUser?.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ seller: sessionUser.userId });
    
    if (!wallet) {
      wallet = await Wallet.create({
        seller: sessionUser.userId,
      });
    }

    // Calculate monthly stats
    await wallet.calculateMonthlyStats();

    // Get recent transactions (last 50)
    const recentTransactions = wallet.transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    return new Response(
      JSON.stringify({
        balance: wallet.availableBalance,
        pendingBalance: wallet.pendingBalance,
        totalEarnings: wallet.totalEarnings,
        totalPayouts: wallet.totalPayouts,
        totalFees: wallet.totalFees,
        currency: wallet.currency,
        stats: wallet.stats,
        // Masked: the seller already knows their own account number, and the
        // UI only needs enough to confirm which account payouts will go to.
        bankDetails: wallet.bankDetails ? {
          accountHolder: wallet.bankDetails.accountHolder,
          bankName: wallet.bankDetails.bankName,
          accountNumber: maskAccountNumber(decryptField(wallet.bankDetails.accountNumber)),
          branchCode: wallet.bankDetails.branchCode,
          accountType: wallet.bankDetails.accountType,
          verified: wallet.bankDetails.verified,
        } : null,
        payoutSettings: wallet.payoutSettings,
        transactions: recentTransactions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Wallet GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
