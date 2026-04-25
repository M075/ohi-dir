// ============================================================================
// FILE 4: app/api/wallet/transactions/route.js
// ============================================================================
import connectDB from '@/config/database';
import Wallet from '@/models/Wallet';
import { getSessionUser } from '@/utils/getSessionUser';

// GET - Fetch transactions with filters
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // sale, refund, payout
    const status = searchParams.get('status'); // pending, completed, failed
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    const wallet = await Wallet.findOne({ seller: sessionUser.userId });
    
    if (!wallet) {
      return new Response(
        JSON.stringify({ transactions: [], total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter transactions
    let transactions = wallet.transactions;

    if (type && type !== 'all') {
      transactions = transactions.filter(t => t.type === type);
    }

    if (status && status !== 'all') {
      transactions = transactions.filter(t => t.status === status);
    }

    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => t.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      transactions = transactions.filter(t => t.createdAt <= end);
    }

    // Sort by date descending
    transactions = transactions.sort((a, b) => b.createdAt - a.createdAt);

    const total = transactions.length;
    const paginatedTransactions = transactions.slice(skip, skip + limit);

    return new Response(
      JSON.stringify({
        transactions: paginatedTransactions,
        total,
        limit,
        skip,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transactions GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

