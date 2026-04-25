// ============================================================================
// FILE 1: app/api/admin/payouts/route.js
// ============================================================================
import connectDB from '@/config/database';
import Payout from '@/models/Payout';
import Wallet from '@/models/Wallet';
import User from '@/models/User';
import { getSessionUser } from '@/utils/getSessionUser';

// Middleware to check admin access
async function checkAdminAccess(sessionUser) {
  if (!sessionUser?.userId) {
    return { authorized: false, error: 'Unauthorized' };
  }

  const user = await User.findById(sessionUser.userId);
  
  if (!user?.isAdmin || !user?.adminPermissions?.includes('manage_sellers')) {
    return { authorized: false, error: 'Admin access required' };
  }

  return { authorized: true, user };
}

// GET - Fetch all payouts with filters
export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    const { authorized, error, user } = await checkAdminAccess(sessionUser);
    if (!authorized) {
      return new Response(
        JSON.stringify({ error }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    let query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.requestedAt = {};
      if (startDate) query.requestedAt.$gte = new Date(startDate);
      if (endDate) query.requestedAt.$lte = new Date(endDate);
    }

    // Search by reference, seller name, or email
    if (search) {
      const sellers = await User.find({
        $or: [
          { storename: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const sellerIds = sellers.map(s => s._id);

      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { seller: { $in: sellerIds } }
      ];
    }

    const payouts = await Payout.find(query)
      .populate('seller', 'storename email image')
      .populate('processedBy', 'storename email')
      .sort({ requestedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Payout.countDocuments(query);

    // Calculate stats
    const stats = {
      pending: {
        count: await Payout.countDocuments({ status: 'pending' }),
        amount: await Payout.aggregate([
          { $match: { status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(res => res[0]?.total || 0)
      },
      processing: {
        count: await Payout.countDocuments({ status: 'processing' }),
        amount: await Payout.aggregate([
          { $match: { status: 'processing' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(res => res[0]?.total || 0)
      },
      completed: {
        count: await Payout.countDocuments({ status: 'completed' }),
        amount: await Payout.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(res => res[0]?.total || 0)
      },
      failed: {
        count: await Payout.countDocuments({ status: 'failed' }),
        amount: await Payout.aggregate([
          { $match: { status: 'failed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(res => res[0]?.total || 0)
      },
    };

    // Monthly totals
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    stats.totalThisMonth = await Payout.aggregate([
      { 
        $match: { 
          status: 'completed',
          completedAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(res => res[0]?.total || 0);

    stats.totalLastMonth = await Payout.aggregate([
      { 
        $match: { 
          status: 'completed',
          completedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]).then(res => res[0]?.total || 0);

    return new Response(
      JSON.stringify({
        payouts,
        total,
        limit,
        skip,
        stats,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin payouts GET error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}










