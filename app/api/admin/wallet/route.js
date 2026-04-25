// app/api/admin/wallet/route.js - Admin wallet/transactions API
import connectDB from '@/config/database';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import Order from '@/models/Order';
import { getSessionUser } from '@/utils/getSessionUser';

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

    const user = await User.findById(sessionUser.userId);
    if (!user?.isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const pendingPayouts = searchParams.get('pendingPayouts');
    
    // If requesting pending payouts specifically
    if (pendingPayouts === 'true') {
      const wallets = await Wallet.find({ availableBalance: { $gt: 0 } })
        .populate('seller', 'storename email')
        .lean();
      
      // Minimum payout threshold - could be moved to env variable or config
      const MINIMUM_PAYOUT_THRESHOLD = parseInt(process.env.MINIMUM_PAYOUT_THRESHOLD || '500');
      
      const pendingPayoutsList = wallets.map(wallet => ({
        sellerId: wallet.seller?._id,
        sellerName: wallet.seller?.storename || 'Unknown',
        sellerEmail: wallet.seller?.email || 'Unknown',
        amount: wallet.availableBalance,
        transactionCount: wallet.transactions?.filter(t => t.status === 'completed' && t.type === 'sale').length || 0
      })).filter(p => p.amount >= MINIMUM_PAYOUT_THRESHOLD);
      
      return new Response(
        JSON.stringify({ pendingPayouts: pendingPayoutsList }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const search = searchParams.get('search');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all wallets and aggregate transactions
    const wallets = await Wallet.find()
      .populate('seller', 'storename email')
      .lean();

    // Flatten all transactions from all wallets
    let allTransactions = [];
    wallets.forEach(wallet => {
      if (wallet.transactions && wallet.transactions.length > 0) {
        wallet.transactions.forEach(tx => {
          allTransactions.push({
            ...tx,
            seller: wallet.seller,
            sellerId: wallet.seller?._id,
            sellerName: wallet.seller?.storename
          });
        });
      }
    });

    // Sort by date descending
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply filters
    if (type && type !== 'all') {
      allTransactions = allTransactions.filter(tx => tx.type === type);
    }

    if (status && status !== 'all') {
      allTransactions = allTransactions.filter(tx => tx.status === status);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allTransactions = allTransactions.filter(tx => 
        tx.orderNumber?.toLowerCase().includes(searchLower) ||
        tx.sellerName?.toLowerCase().includes(searchLower) ||
        tx.buyerName?.toLowerCase().includes(searchLower) ||
        tx._id?.toString().includes(searchLower)
      );
    }

    // Calculate stats
    const completedSales = allTransactions.filter(tx => tx.type === 'sale' && tx.status === 'completed');
    const completedPayouts = allTransactions.filter(tx => tx.type === 'payout' && tx.status === 'completed');
    const pendingPayoutsTotal = wallets.reduce((sum, w) => sum + (w.availableBalance || 0), 0);

    const stats = {
      totalRevenue: completedSales.reduce((sum, tx) => sum + (tx.amount || 0), 0),
      totalFees: completedSales.reduce((sum, tx) => sum + (tx.fee || 0), 0),
      pendingPayouts: pendingPayoutsTotal,
      completedPayouts: completedPayouts.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0),
      totalTransactions: allTransactions.length
    };

    // Pagination
    const total = allTransactions.length;
    const skip = (page - 1) * limit;
    const paginatedTransactions = allTransactions.slice(skip, skip + limit);

    return new Response(
      JSON.stringify({
        transactions: paginatedTransactions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        },
        stats
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin wallet GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
