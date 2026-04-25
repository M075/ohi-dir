// ============================================================================
// FILE 3: app/api/wallet/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';

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
        bankDetails: wallet.bankDetails,
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
