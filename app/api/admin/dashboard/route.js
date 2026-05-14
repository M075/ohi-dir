// app/api/admin/dashboard/route.js
import connectDB from '@/config/database';
import User from '@/models/User';
import Product from '@/models/Product';
import Order from '@/models/Order';
import LedgerEntry from '@/models/LedgerEntry';
import { getSessionUser } from '@/utils/getSessionUser';

export async function GET(request) {
  try {
    await connectDB();
    const sessionUser = await getSessionUser();

    // Check admin privileges
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

    // Gather statistics
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders,
      recentUsers,
      flaggedProducts,
      ledgerTotals
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyer', 'storename email')
        .populate('seller', 'storename'),
      User.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('storename email image isActive createdAt'),
      Product.find({ flagged: true })
        .limit(20)
        .select('title images flagReason'),
      // Aggregate ledger totals by account
      LedgerEntry.aggregate([
        {
          $group: {
            _id: '$account',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const activeStores = await User.countDocuments({ 
      isActive: true,
      storename: { $exists: true, $ne: '' }
    });

    // Build ledger summary map
    const ledgerMap = {};
    ledgerTotals.forEach((item) => {
      ledgerMap[item._id] = { total: item.total, count: item.count };
    });

    const stats = {
      totalUsers,
      totalSellers: activeStores,
      totalBuyers: totalUsers - activeStores,
      totalProducts,
      totalOrders,
      pendingOrders: await Order.countDocuments({ status: 'pending' }),
      totalRevenue: totalRevenue[0]?.total || 0,
      activeStores,
      // Ledger-derived stats
      platformCommission: ledgerMap['platform_commission']?.total || 0,
      sellerEarnings: ledgerMap['seller_earnings']?.total || 0,
      taxCollected: ledgerMap['tax_collected']?.total || 0,
    };

    // Shipping breakdown by provider
    const shippingBreakdown = {
      courierGuy: {
        count: ledgerMap['shipping_courier_guy']?.count || 0,
        total: ledgerMap['shipping_courier_guy']?.total || 0,
      },
      pudo: {
        count: ledgerMap['shipping_pudo']?.count || 0,
        total: ledgerMap['shipping_pudo']?.total || 0,
      },
    };

    return new Response(
      JSON.stringify({ 
        stats, 
        recentOrders, 
        recentUsers,
        flaggedProducts,
        shippingBreakdown,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
